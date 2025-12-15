from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from uuid import UUID
import os
import shutil
from pathlib import Path
from datetime import datetime
from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.robot import Robot
from app.schemas.robot import (
    RobotCreate,
    RobotUpdate,
    RobotResponse,
    RobotListResponse
)

router = APIRouter(prefix="/robots", tags=["Robots"])


@router.get("", response_model=RobotListResponse)
async def list_robots(
    category: Optional[str] = None,
    status: Optional[str] = Query("active", regex="^(active|inactive|maintenance)$"),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List available robots"""
    query = select(Robot).where(Robot.status == status)

    # Filter by category if provided
    if category:
        query = query.where(Robot.services.contains([category]))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get robots with pagination
    query = query.offset(skip).limit(limit).order_by(Robot.created_at.desc())
    result = await db.execute(query)
    robots = result.scalars().all()

    return {
        "robots": robots,
        "total": total
    }


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(
    robot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get robot details"""
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    return robot


@router.post("", response_model=RobotResponse, status_code=201)
async def create_robot(
    robot_data: RobotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("user"))
):
    """Create a new robot (robot_owner or admin only)"""
    # Validate price
    if robot_data.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")

    # Create robot
    new_robot = Robot(
        owner_id=current_user.id,
        name=robot_data.name,
        description=robot_data.description,
        price=robot_data.price,
        currency=robot_data.currency,
        wallet_address=robot_data.wallet_address,
        image_url=robot_data.image_url,
        services=robot_data.services,
        endpoint=robot_data.endpoint,
        status="active"
    )

    db.add(new_robot)
    await db.commit()
    await db.refresh(new_robot)

    return new_robot


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    robot_id: UUID,
    robot_data: RobotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update robot (owner or admin only)"""
    # Get robot
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    # Check ownership or admin
    if robot.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this robot")

    # Update fields
    update_data = robot_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(robot, field, value)

    await db.commit()
    await db.refresh(robot)

    return robot


@router.delete("/{robot_id}", status_code=204)
async def delete_robot(
    robot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Delete robot (admin only)"""
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    await db.delete(robot)
    await db.commit()

    return None


@router.post("/upload-image")
async def upload_robot_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload robot image"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")

    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()  # Get position (file size)
    file.file.seek(0)  # Reset to beginning

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/robots")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = Path(file.filename).suffix
    unique_filename = f"{current_user.id}_{timestamp}{file_extension}"
    file_path = upload_dir / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Return URL (relative path that frontend can use)
    image_url = f"/uploads/robots/{unique_filename}"

    return {"image_url": image_url}


@router.get("/{robot_id}/metrics")
async def get_robot_metrics(
    robot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get robot metrics"""
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    return {
        "robot_id": robot.id,
        "name": robot.name,
        "total_executions": robot.execution_count,
        "total_revenue": float(robot.total_revenue),
        "avg_response_time": robot.avg_response_time,
        "success_rate": robot.success_rate,
        "price": float(robot.price),
        "status": robot.status
    }
