from fastapi import APIRouter, Depends, HTTPException, Header, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from app.database import get_db
from app.core.security import get_current_user
from app.core.x402 import generate_x402_response
from app.core.session import get_session_manager
from app.models.user import User
from app.models.robot import Robot
from app.schemas.payment import ExecutePayload, ExecuteResponse
from app.services.robot_executor import robot_executor
from sqlalchemy import select

router = APIRouter(prefix="/execute", tags=["Execution"])


@router.post("/{robot_id}", response_model=None)
async def execute_robot(
    robot_id: str,
    payload: ExecutePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_session_id: Optional[str] = Header(None)
):
    """
    Execute a robot task. Returns 402 Payment Required if payment not completed.
    """
    # Get robot
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    if robot.status != "active":
        raise HTTPException(status_code=400, detail=f"Robot is {robot.status}")

    session_manager = get_session_manager()

    # Check if session exists and is paid
    if x_session_id:
        session = await session_manager.get_session(x_session_id)

        if session and session.status == "paid":
            # Verify session belongs to this user and robot
            if str(session.user_id) != str(current_user.id):
                raise HTTPException(status_code=403, detail="Invalid session")

            if str(session.robot_id) != str(robot_id):
                raise HTTPException(status_code=400, detail="Session does not match robot")

            # Execute the robot (convert IDs to UUID for executor)
            try:
                result = await robot_executor.execute(
                    robot_id=UUID(robot_id),
                    user_id=UUID(str(current_user.id)),
                    session_id=UUID(session.id),
                    payload=payload.model_dump(),
                    db=db
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid ID format: {str(e)}")

            return result

    # Calculate amount based on rental plan or base price
    amount = float(robot.price)
    if payload.rental_plan_index is not None and robot.rental_plans:
        if 0 <= payload.rental_plan_index < len(robot.rental_plans):
            selected_plan = robot.rental_plans[payload.rental_plan_index]
            amount = float(selected_plan.get('price', robot.price))

    # No valid paid session - create new session and return 402
    new_session = await session_manager.create_session(
        user_id=str(current_user.id),
        robot_id=str(robot_id),
        amount=amount,
        recipient_address=robot.wallet_address,
        service_payload=payload.model_dump()
    )

    # Return 402 Payment Required
    return generate_x402_response(
        robot_id=str(robot_id),
        robot_name=robot.name,
        amount=amount,
        recipient_address=robot.wallet_address,
        service=payload.service,
        session_id=new_session.id
    )
