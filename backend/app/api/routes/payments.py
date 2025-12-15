from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.blockchain import get_payment_verifier
from app.core.session import get_session_manager
from app.models.user import User
from app.models.payment import PaymentSessionDB
from app.schemas.payment import PaymentVerification, PaymentVerificationResponse

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
    is_valid = await payment_verifier.verify_transaction(
        signature=verification.tx_signature,
        expected_amount=session.amount,
        recipient=session.recipient_address,
        memo=session.id
    )

    if not is_valid:
        return {
            "verified": False,
            "session_id": session.id,
            "error": "Transaction verification failed. Please check the transaction and try again."
        }

    # Mark session as paid
    await session_manager.mark_paid(session.id, verification.tx_signature)

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
