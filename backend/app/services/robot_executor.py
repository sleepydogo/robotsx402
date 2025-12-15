import httpx
import time
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.robot import Robot
from app.models.payment import ExecutionLog
from uuid import UUID


class RobotExecutor:
    """
    Service to execute robot tasks by calling their endpoints
    """

    async def execute(
        self,
        robot_id: UUID,
        user_id: UUID,
        session_id: Optional[UUID],
        payload: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Execute a robot task
        """
        # Get robot details
        result = await db.execute(select(Robot).where(Robot.id == robot_id))
        robot = result.scalar_one_or_none()

        if not robot:
            raise ValueError("Robot not found")

        if robot.status != "active":
            raise ValueError(f"Robot is {robot.status}")

        start_time = time.time()
        execution_log = ExecutionLog(
            session_id=session_id,
            robot_id=robot_id,
            user_id=user_id,
            status="pending"
        )

        try:
            # Call robot endpoint
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    robot.endpoint,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                response.raise_for_status()
                result_data = response.json()

            # Calculate execution time
            execution_time = time.time() - start_time

            # Update execution log
            execution_log.status = "success"
            execution_log.response_time = execution_time

            # Update robot metrics
            new_count = robot.execution_count + 1
            new_avg_time = (
                (robot.avg_response_time * robot.execution_count + execution_time) / new_count
            )

            await db.execute(
                update(Robot)
                .where(Robot.id == robot_id)
                .values(
                    execution_count=new_count,
                    avg_response_time=new_avg_time,
                    total_revenue=robot.total_revenue + robot.price
                )
            )

            db.add(execution_log)
            await db.commit()

            return {
                "success": True,
                "data": result_data,
                "execution_time": execution_time
            }

        except httpx.HTTPError as e:
            execution_time = time.time() - start_time
            execution_log.status = "error"
            execution_log.response_time = execution_time
            execution_log.error = str(e)

            # Update robot success rate
            total = robot.execution_count + 1
            successes = robot.execution_count * robot.success_rate
            new_success_rate = successes / total

            await db.execute(
                update(Robot)
                .where(Robot.id == robot_id)
                .values(
                    execution_count=total,
                    success_rate=new_success_rate
                )
            )

            db.add(execution_log)
            await db.commit()

            return {
                "success": False,
                "error": f"Robot execution failed: {str(e)}",
                "execution_time": execution_time
            }

        except Exception as e:
            execution_log.status = "error"
            execution_log.error = str(e)
            db.add(execution_log)
            await db.commit()

            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }


# Global executor instance
robot_executor = RobotExecutor()
