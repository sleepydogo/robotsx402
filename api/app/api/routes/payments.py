from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.blockchain import get_payment_verifier
from app.core.session import get_session_manager
from app.models.user import User
from app.models.payment import PaymentSessionDB
from app.models.robot import Robot
from app.schemas.payment import PaymentVerification, PaymentVerificationResponse
from sqlalchemy import select

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    verification: PaymentVerification,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify a payment transaction on-chain and mark session as paid
    """
    session_manager = get_session_manager()
    payment_verifier = get_payment_verifier()

    # Get session
    session = await session_manager.get_session(verification.session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Payment session not found or expired")

    # Check if already paid
    if session.status == "paid":
        return {
            "verified": True,
            "session_id": session.id
        }

    # Check session ownership
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to verify this payment")

    # Verify transaction on blockchain
    # Note: memo verification is optional for now (SPL token transfers don't include memos easily)
    is_valid = await payment_verifier.verify_transaction(
        signature=verification.tx_signature,
        expected_amount=session.amount,
        recipient=session.recipient_address,
        memo=None  # Temporarily disabled - TODO: add memo support to SPL transfers
    )

    if not is_valid:
        return {
            "verified": False,
            "session_id": session.id,
            "error": "Transaction verification failed. Please check the transaction and try again."
        }

    # Mark session as paid
    await session_manager.mark_paid(session.id, verification.tx_signature)

    # Get robot to determine lock duration
    robot_query = select(Robot).where(Robot.id == session.robot_id)
    robot_result = await db.execute(robot_query)
    robot = robot_result.scalar_one_or_none()

    # Determine lock duration from rental plan
    duration_minutes = 10  # Default
    if robot and robot.rental_plans and session.service_payload:
        rental_plan_index = session.service_payload.get('rental_plan_index')
        if rental_plan_index is not None and 0 <= rental_plan_index < len(robot.rental_plans):
            selected_plan = robot.rental_plans[rental_plan_index]
            duration_minutes = selected_plan.get('duration_minutes', 10)

    # Lock the robot for exclusive use
    lock_acquired = await session_manager.lock_robot(
        robot_id=session.robot_id,
        user_id=session.user_id,
        duration_minutes=duration_minutes
    )

    if not lock_acquired:
        # This shouldn't happen since we check before creating session,
        # but handle it gracefully
        raise HTTPException(
            status_code=409,
            detail="Robot is currently locked by another user"
        )

    # Save to database for historical records
    db_session = PaymentSessionDB(
        id=session.id,
        user_id=session.user_id,
        robot_id=session.robot_id,
        amount=session.amount,
        currency=session.currency,
        recipient_address=session.recipient_address,
        status="paid",
        tx_signature=verification.tx_signature,
        service_payload=session.service_payload,
        created_at=session.created_at,
        expires_at=session.expires_at,
        paid_at=session.paid_at
    )

    db.add(db_session)
    await db.commit()

    return {
        "verified": True,
        "session_id": session.id
    }


@router.get("/session/{session_id}")
async def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment session status"""
    session_manager = get_session_manager()
    session = await session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check ownership
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "session_id": session.id,
        "status": session.status,
        "amount": session.amount,
        "currency": session.currency,
        "created_at": session.created_at,
        "expires_at": session.expires_at,
        "paid_at": session.paid_at
    }


@router.get("/sessions/my")
async def get_my_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50
):
    """Get all payment sessions for the current user"""
    from sqlalchemy import select, desc
    from app.models.robot import Robot

    # Query sessions from database
    query = select(PaymentSessionDB).where(
        PaymentSessionDB.user_id == str(current_user.id)
    )

    # Filter by status if provided
    if status:
        query = query.where(PaymentSessionDB.status == status)

    # Order by created date (most recent first) and limit
    query = query.order_by(desc(PaymentSessionDB.created_at)).limit(limit)

    result = await db.execute(query)
    sessions = result.scalars().all()

    # Enrich sessions with robot information
    enriched_sessions = []
    for session in sessions:
        # Get robot details
        robot_query = select(Robot).where(Robot.id == session.robot_id)
        robot_result = await db.execute(robot_query)
        robot = robot_result.scalar_one_or_none()

        session_data = {
            "session_id": session.id,
            "robot_id": session.robot_id,
            "robot_name": robot.name if robot else "Unknown Robot",
            "robot_image_url": robot.image_url if robot else None,
            "amount": float(session.amount),
            "currency": session.currency,
            "status": session.status,
            "tx_signature": session.tx_signature,
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "paid_at": session.paid_at.isoformat() if session.paid_at else None,
            "service": session.service_payload.get("service", "control") if session.service_payload else "control"
        }
        enriched_sessions.append(session_data)

    return {
        "sessions": enriched_sessions,
        "total": len(enriched_sessions)
    }


@router.get("/stats/my")
async def get_my_payment_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment statistics for the current user"""
    from sqlalchemy import select, func

    # Total sessions
    total_sessions_query = select(func.count()).select_from(PaymentSessionDB).where(
        PaymentSessionDB.user_id == str(current_user.id)
    )
    total_sessions_result = await db.execute(total_sessions_query)
    total_sessions = total_sessions_result.scalar() or 0

    # Paid sessions
    paid_sessions_query = select(func.count()).select_from(PaymentSessionDB).where(
        PaymentSessionDB.user_id == str(current_user.id),
        PaymentSessionDB.status == "paid"
    )
    paid_sessions_result = await db.execute(paid_sessions_query)
    paid_sessions = paid_sessions_result.scalar() or 0

    # Total spent
    total_spent_query = select(func.sum(PaymentSessionDB.amount)).where(
        PaymentSessionDB.user_id == str(current_user.id),
        PaymentSessionDB.status == "paid"
    )
    total_spent_result = await db.execute(total_spent_query)
    total_spent = float(total_spent_result.scalar() or 0)

    # Last payment date
    last_payment_query = select(PaymentSessionDB.paid_at).where(
        PaymentSessionDB.user_id == str(current_user.id),
        PaymentSessionDB.status == "paid"
    ).order_by(PaymentSessionDB.paid_at.desc()).limit(1)
    last_payment_result = await db.execute(last_payment_query)
    last_payment = last_payment_result.scalar()

    # Most used robot
    most_used_robot_query = select(
        PaymentSessionDB.robot_id,
        func.count(PaymentSessionDB.robot_id).label('count')
    ).where(
        PaymentSessionDB.user_id == str(current_user.id),
        PaymentSessionDB.status == "paid"
    ).group_by(PaymentSessionDB.robot_id).order_by(func.count(PaymentSessionDB.robot_id).desc()).limit(1)

    most_used_result = await db.execute(most_used_robot_query)
    most_used_data = most_used_result.first()

    most_used_robot = None
    if most_used_data:
        from app.models.robot import Robot
        robot_query = select(Robot).where(Robot.id == most_used_data[0])
        robot_result = await db.execute(robot_query)
        robot = robot_result.scalar_one_or_none()
        if robot:
            most_used_robot = {
                "robot_id": robot.id,
                "robot_name": robot.name,
                "session_count": most_used_data[1]
            }

    return {
        "total_sessions": total_sessions,
        "paid_sessions": paid_sessions,
        "pending_sessions": total_sessions - paid_sessions,
        "total_spent": total_spent,
        "currency": "rUSD",
        "last_payment_at": last_payment.isoformat() if last_payment else None,
        "most_used_robot": most_used_robot
    }
