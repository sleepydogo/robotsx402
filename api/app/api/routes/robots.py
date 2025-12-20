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
import httpx
import anthropic
import json
import re
from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.robot import Robot
from app.schemas.robot import (
    RobotCreate,
    RobotUpdate,
    RobotResponse,
    RobotListResponse,
    APIExploreRequest,
    APIExploreResponse
)
from app.config import settings

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
    robot_id: str,
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

    # Convert GPS coordinates to dict if provided
    gps_coords = None
    if robot_data.gps_coordinates:
        gps_coords = {
            "lat": robot_data.gps_coordinates.lat,
            "lng": robot_data.gps_coordinates.lng
        }

    # Convert rental plans to dict if provided
    rental_plans_data = None
    if robot_data.rental_plans:
        rental_plans_data = [plan.model_dump() for plan in robot_data.rental_plans]

    # Create robot
    new_robot = Robot(
        owner_id=current_user.id,
        name=robot_data.name,
        category=robot_data.category,
        description=robot_data.description,
        price=robot_data.price,
        currency=robot_data.currency,
        wallet_address=robot_data.wallet_address,
        image_url=robot_data.image_url,
        services=robot_data.services,
        endpoint=robot_data.endpoint,
        status="active",
        control_api_url=robot_data.control_api_url,
        video_stream_url=robot_data.video_stream_url,
        has_gps=1 if robot_data.has_gps else 0,
        gps_coordinates=gps_coords,
        interface_config=robot_data.interface_config,
        rental_plans=rental_plans_data
    )

    db.add(new_robot)
    await db.commit()
    await db.refresh(new_robot)

    return new_robot


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    robot_id: str,
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
    robot_id: str,
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


@router.post("/explore-api", response_model=APIExploreResponse)
async def explore_robot_api(
    request: APIExploreRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Explore robot API using Claude AI and generate a control interface configuration.
    This endpoint analyzes the robot's API and creates a custom control interface.
    """
    try:
        request.api_url = request.api_url.rstrip('/')
        # 1. Attempt to fetch API documentation
        api_docs = await fetch_api_documentation(request.api_url)

        # 2. Call Claude API to generate the interface
        interface_config = await generate_interface_with_ai(
            api_url=request.api_url,
            api_docs=api_docs,
            robot_name=request.robot_name,
            has_video=request.has_video,
            has_gps=request.has_gps
        )

        return {"interface_config": interface_config}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to explore API: {str(e)}")


async def fetch_api_documentation(api_url: str) -> dict:
    """
    Attempt to fetch API documentation from common endpoints
    (OpenAPI, Swagger, API docs, etc.)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        endpoints_to_try = [
            f"{api_url}/openapi.json",
            f"{api_url}/swagger.json",
            f"{api_url}/docs",
            f"{api_url}/api-docs",
            api_url
        ]

        for endpoint in endpoints_to_try:
            try:
                response = await client.get(endpoint)
                if response.status_code == 200:
                    return {
                        "url": endpoint,
                        "content": response.text[:5000],  # Limit size to prevent token overflow
                        "content_type": response.headers.get("content-type")
                    }
            except:
                continue

        # Si no se encontró documentación, lanzar error
        raise HTTPException(
            status_code=404,
            detail=f"No se pudo encontrar documentación de API en {api_url}. Endpoints probados: /openapi.json, /swagger.json, /docs, /api-docs"
        )


async def generate_interface_with_ai(
    api_url: str,
    api_docs: dict,
    robot_name: str,
    has_video: bool,
    has_gps: bool
) -> dict:
    """
    Use Claude AI to generate the control interface configuration
    based on the robot's API documentation
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are an expert in robot control interfaces and API analysis.

I need you to analyze this robot API and generate a comprehensive control interface configuration.

Robot Name: {robot_name}
API URL: {api_url}
Has Video Stream: {has_video}
Has GPS: {has_gps}

API Documentation:
{json.dumps(api_docs, indent=2)}

IMPORTANT INSTRUCTIONS:
1. Carefully examine ALL endpoints in the OpenAPI/Swagger documentation
2. Look for endpoints in the "paths" section of the OpenAPI schema
3. For EACH endpoint that accepts POST requests, create appropriate controls
4. Generate MULTIPLE controls - aim for at least 8-12 controls if the API supports it
5. Categorize endpoints by their function:
   - Movement endpoints (/move, /rotate) → buttons for each direction
   - Value endpoints (/speed, /arm/position) → sliders
   - Camera/positioning (/camera/move) → joystick
   - On/off endpoints (/lights, /motor) → toggles

Control Type Guidelines:
- "button": For discrete actions with fixed parameters
  Example: POST /move with {{"direction": "forward"}} → Create separate buttons for forward, backward, left, right
- "slider": For endpoints with numeric ranges (0-100, 0-360, etc.)
  Example: POST /speed with {{"value": 50}} → Slider from 0 to 100
- "joystick": For 2-axis controls (pan/tilt, x/y)
  Example: POST /camera/move with {{"pan": 0, "tilt": 0}} → Joystick control
- "toggle": For boolean states (enabled/disabled, on/off)
  Example: POST /lights with {{"enabled": true}} → Toggle switch

For movement endpoints like /move that accept different directions, create ONE button for EACH direction:
- move_forward button with params {{"direction": "forward", "speed": 50}}
- move_backward button with params {{"direction": "backward", "speed": 50}}
- move_left button with params {{"direction": "left", "speed": 50}}
- move_right button with params {{"direction": "right", "speed": 50}}

Return ONLY valid JSON (no markdown, no explanation):
{{
  "controls": [
    // Movement buttons
    {{"id": "move_forward", "type": "button", "label": "Move Forward", "endpoint": "/move", "method": "POST", "params": {{"direction": "forward", "speed": 50}}, "icon": "ArrowUp"}},
    {{"id": "move_backward", "type": "button", "label": "Move Backward", "endpoint": "/move", "method": "POST", "params": {{"direction": "backward", "speed": 50}}, "icon": "ArrowDown"}},
    {{"id": "move_left", "type": "button", "label": "Move Left", "endpoint": "/move", "method": "POST", "params": {{"direction": "left", "speed": 50}}, "icon": "ArrowLeft"}},
    {{"id": "move_right", "type": "button", "label": "Move Right", "endpoint": "/move", "method": "POST", "params": {{"direction": "right", "speed": 50}}, "icon": "ArrowRight"}},

    // Rotation buttons
    {{"id": "rotate_left", "type": "button", "label": "Rotate Left", "endpoint": "/rotate", "method": "POST", "params": {{"direction": "left", "degrees": 90}}, "icon": "RotateCcw"}},
    {{"id": "rotate_right", "type": "button", "label": "Rotate Right", "endpoint": "/rotate", "method": "POST", "params": {{"direction": "right", "degrees": 90}}, "icon": "RotateCw"}},

    // Sliders
    {{"id": "speed_control", "type": "slider", "label": "Speed", "endpoint": "/speed", "method": "POST", "param_name": "value", "min": 0, "max": 100, "step": 5, "unit": "%"}},
    {{"id": "arm_height", "type": "slider", "label": "Arm Height", "endpoint": "/arm/position", "method": "POST", "param_name": "height", "min": 0, "max": 100, "step": 5, "unit": "cm"}},

    // Joystick
    {{"id": "camera_control", "type": "joystick", "label": "Camera Control", "endpoint": "/camera/move", "method": "POST", "axes": ["pan", "tilt"], "range": {{"pan": [-180, 180], "tilt": [-90, 90]}}}},

    // Toggles
    {{"id": "lights", "type": "toggle", "label": "Lights", "endpoint": "/lights", "method": "POST", "param_name": "enabled"}},
    {{"id": "motor", "type": "toggle", "label": "Motor", "endpoint": "/motor", "method": "POST", "param_name": "enabled"}},

    // Emergency
    {{"id": "emergency_stop", "type": "button", "label": "Emergency Stop", "endpoint": "/stop", "method": "POST", "params": {{}}, "icon": "AlertOctagon"}}
  ],
  "has_video": {has_video},
  "has_gps": {has_gps},
  "api_version": "1.0",
  "discovered_endpoints": ["/status", "/move", "/rotate", "/speed", "/lights", "/motor", "/camera/move", "/arm/position", "/stop"]
}}

Generate ALL controls based on the API documentation. Be thorough!
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000, 
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract JSON from response
        response_text = message.content[0].text

        # Try to parse JSON (it might be wrapped in ```json``` code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)

        interface_config = json.loads(response_text)
        return interface_config

    except json.JSONDecodeError as e:
        # Si falla el parsing de JSON, lanzar error
        raise HTTPException(
            status_code=500,
            detail=f"Error al parsear la respuesta de Claude AI: {str(e)}. Respuesta recibida: {response_text[:200]}"
        )
    except anthropic.APIError as e:
        # Error de la API de Anthropic
        raise HTTPException(
            status_code=500,
            detail=f"Error al llamar a Claude AI: {str(e)}"
        )
    except Exception as e:
        # Cualquier otro error
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado al generar interfaz: {str(e)}"
        )


@router.get("/{robot_id}/availability")
async def check_robot_availability(
    robot_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a robot is available for use (not locked by another user)
    Public endpoint - no auth required
    """
    from app.core.session import get_session_manager

    # Check if robot exists
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    # Check if robot is locked
    session_manager = get_session_manager()
    is_locked = await session_manager.is_robot_locked(robot_id)

    if not is_locked:
        return {
            "robot_id": robot_id,
            "available": True,
            "status": "available"
        }

    # Get lock info
    lock_info = await session_manager.get_robot_lock_info(robot_id)
    ttl = await session_manager.get_robot_ttl(robot_id)

    return {
        "robot_id": robot_id,
        "available": False,
        "status": "busy",
        "locked_by_user_id": lock_info.get("user_id") if lock_info else None,
        "time_remaining_seconds": ttl,
        "time_remaining_minutes": (ttl // 60) if ttl else 0
    }


@router.get("/{robot_id}/metrics")
async def get_robot_metrics(
    robot_id: str,
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
