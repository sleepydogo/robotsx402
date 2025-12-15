"""
FastAPI application for Chess Robotic Arm Control
Provides endpoints for robot movement control and webcam streaming
"""
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import asyncio
import logging

from config import settings
from dependencies import verify_api_key
from camera import VideoCamera
from handler_brazo_robotico import RoboticArm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Chess Robotic Arm API",
    description="API for controlling a chess robotic arm with video streaming",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins including file:// for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global instances (singleton pattern)
robot_arm: Optional[RoboticArm] = None
video_camera: Optional[VideoCamera] = None
robot_lock = asyncio.Lock()


class Position(BaseModel):
    """Chess board position (0-7)"""
    x: int = Field(..., ge=0, le=7, description="Row position (0-7)")
    y: int = Field(..., ge=0, le=7, description="Column position (0-7)")


class MoveRequest(BaseModel):
    """Request body for robot movement"""
    from_pos: Position = Field(..., alias="from", description="Starting position")
    to: Position = Field(..., description="Target position")
    action: str = Field("move", description="Action type: 'move' or 'capture'")

    class Config:
        populate_by_name = True


class MoveResponse(BaseModel):
    """Response for successful robot movement"""
    status: str
    move: dict
    timestamp: str


@app.on_event("startup")
async def startup_event():
    """Initialize robot arm and camera on startup"""
    global robot_arm, video_camera

    try:
        logger.info("Initializing robotic arm...")
        robot_arm = RoboticArm()
        robot_arm.init()
        logger.info("Robotic arm initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize robotic arm: {e}")
        logger.warning("Continuing without robotic arm - moves will be simulated")
        robot_arm = None

    try:
        logger.info("Initializing camera...")
        video_camera = VideoCamera(camera_index=settings.CAMERA_INDEX)
        logger.info("Camera initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize camera: {e}")
        video_camera = None


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    global robot_arm, video_camera

    if robot_arm:
        try:
            robot_arm.close()
            logger.info("Robotic arm connection closed")
        except Exception as e:
            logger.error(f"Error closing robotic arm: {e}")

    if video_camera:
        try:
            video_camera.release()
            logger.info("Camera released")
        except Exception as e:
            logger.error(f"Error releasing camera: {e}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Chess Robotic Arm API",
        "status": "running",
        "robot_connected": robot_arm is not None,
        "camera_connected": video_camera is not None,
    }


@app.post("/api/robot/move", response_model=MoveResponse, dependencies=[Depends(verify_api_key)])
async def move_robot(move: MoveRequest):
    """
    Execute a chess move with the robotic arm

    Requires X-API-Key header for authentication
    """
    if robot_arm is None:
        raise HTTPException(status_code=503, detail="Robotic arm not available")

    # Acquire lock to prevent concurrent movements
    async with robot_lock:
        try:
            logger.info(f"Executing move: ({move.from_pos.x},{move.from_pos.y}) -> ({move.to.x},{move.to.y})")

            # If capture action, remove the piece first
            if move.action == "capture":
                logger.info(f"Capturing piece at ({move.to.x},{move.to.y})")
                await asyncio.to_thread(
                    robot_arm.sacarPieza,
                    move.to.x,
                    move.to.y
                )

            # Execute the move
            await asyncio.to_thread(
                robot_arm.mover,
                move.from_pos.x,
                move.from_pos.y,
                move.to.x,
                move.to.y
            )

            logger.info("Move completed successfully")

            return MoveResponse(
                status="success",
                move={
                    "from": [move.from_pos.x, move.from_pos.y],
                    "to": [move.to.x, move.to.y],
                    "action": move.action
                },
                timestamp=datetime.utcnow().isoformat() + "Z"
            )

        except Exception as e:
            logger.error(f"Error executing move: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to execute move: {str(e)}")


@app.get("/api/robot/stream", dependencies=[Depends(verify_api_key)])
async def video_stream():
    """
    Stream live video from the webcam using MJPEG format

    Requires X-API-Key header for authentication
    Can be displayed directly in HTML: <img src="/api/robot/stream" />
    """
    if video_camera is None:
        raise HTTPException(status_code=503, detail="Camera not available")

    try:
        return StreamingResponse(
            video_camera.generate_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except Exception as e:
        logger.error(f"Error streaming video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stream video: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level="info"
    )
