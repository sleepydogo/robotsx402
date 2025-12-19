"""
🤖 Test Robot API for x402 Platform
Simple FastAPI robot simulator for testing AI interface generation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

app = FastAPI(
    title="Test Robot API",
    description="Simulated robot control API for testing x402 platform AI interface generation",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS - Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================
# Robot State (In-Memory)
# ===========================

robot_state = {
    "position": {"x": 0, "y": 0, "heading": 0},
    "speed": 50,
    "battery": 85,
    "lights": False,
    "motor_enabled": True,
    "camera": {"pan": 0, "tilt": 0},
    "arm": {"height": 50, "gripper_open": True},
    "sensors": {
        "temperature": 22.5,
        "distance_front": 150,
        "distance_back": 200
    },
    "status": "idle",  # idle | moving | error
    "last_command": None,
    "last_updated": datetime.now().isoformat()
}


# ===========================
# Pydantic Models
# ===========================

class MoveRequest(BaseModel):
    direction: str  # forward | backward | left | right
    speed: Optional[int] = 50


class RotateRequest(BaseModel):
    direction: str  # left | right
    degrees: int


class SpeedRequest(BaseModel):
    value: int  # 0-100


class LightsRequest(BaseModel):
    enabled: bool


class MotorRequest(BaseModel):
    enabled: bool


class CameraRequest(BaseModel):
    pan: Optional[int] = None  # -180 to 180
    tilt: Optional[int] = None  # -90 to 90


class ArmPositionRequest(BaseModel):
    height: int  # 0-100 cm


class GripperRequest(BaseModel):
    open: bool


# ===========================
# API Endpoints
# ===========================

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "Test Robot API",
        "version": "1.0.0",
        "status": "online",
        "robot_model": "Atlas MK-4 Simulator",
        "endpoints": [
            "/status",
            "/move",
            "/rotate",
            "/speed",
            "/lights",
            "/motor",
            "/camera/move",
            "/arm/position",
            "/arm/gripper",
            "/sensors",
            "/stop"
        ]
    }


@app.get("/status")
async def get_status():
    """Get current robot status"""
    return {
        "status": robot_state["status"],
        "position": robot_state["position"],
        "speed": robot_state["speed"],
        "battery": robot_state["battery"],
        "lights": robot_state["lights"],
        "motor_enabled": robot_state["motor_enabled"],
        "camera": robot_state["camera"],
        "arm": robot_state["arm"],
        "last_command": robot_state["last_command"],
        "timestamp": datetime.now().isoformat()
    }


@app.post("/move")
async def move(request: MoveRequest):
    """Move the robot in a direction"""
    valid_directions = ["forward", "backward", "left", "right"]

    if request.direction not in valid_directions:
        raise HTTPException(status_code=400, detail=f"Invalid direction. Must be one of: {valid_directions}")

    if not 0 <= request.speed <= 100:
        raise HTTPException(status_code=400, detail="Speed must be between 0 and 100")

    if not robot_state["motor_enabled"]:
        raise HTTPException(status_code=400, detail="Motor is disabled. Enable motor first.")

    # Simulate movement
    robot_state["status"] = "moving"
    robot_state["speed"] = request.speed
    robot_state["last_command"] = f"move_{request.direction}"
    robot_state["last_updated"] = datetime.now().isoformat()

    # Update position (simplified simulation)
    if request.direction == "forward":
        robot_state["position"]["y"] += 10
    elif request.direction == "backward":
        robot_state["position"]["y"] -= 10
    elif request.direction == "left":
        robot_state["position"]["x"] -= 10
    elif request.direction == "right":
        robot_state["position"]["x"] += 10

    return {
        "message": f"Moving {request.direction} at {request.speed}% speed",
        "position": robot_state["position"],
        "status": "success"
    }


@app.post("/rotate")
async def rotate(request: RotateRequest):
    """Rotate the robot"""
    if request.direction not in ["left", "right"]:
        raise HTTPException(status_code=400, detail="Direction must be 'left' or 'right'")

    if not 0 <= request.degrees <= 360:
        raise HTTPException(status_code=400, detail="Degrees must be between 0 and 360")

    # Update heading
    if request.direction == "left":
        robot_state["position"]["heading"] -= request.degrees
    else:
        robot_state["position"]["heading"] += request.degrees

    # Normalize heading to 0-360
    robot_state["position"]["heading"] = robot_state["position"]["heading"] % 360

    robot_state["last_command"] = f"rotate_{request.direction}"
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Rotated {request.direction} by {request.degrees} degrees",
        "heading": robot_state["position"]["heading"],
        "status": "success"
    }


@app.post("/speed")
async def set_speed(request: SpeedRequest):
    """Set robot speed (0-100%)"""
    if not 0 <= request.value <= 100:
        raise HTTPException(status_code=400, detail="Speed must be between 0 and 100")

    robot_state["speed"] = request.value
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Speed set to {request.value}%",
        "speed": robot_state["speed"],
        "status": "success"
    }


@app.post("/lights")
async def set_lights(request: LightsRequest):
    """Turn lights on/off"""
    robot_state["lights"] = request.enabled
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Lights turned {'on' if request.enabled else 'off'}",
        "lights": robot_state["lights"],
        "status": "success"
    }


@app.post("/motor")
async def set_motor(request: MotorRequest):
    """Enable/disable motor"""
    robot_state["motor_enabled"] = request.enabled

    if not request.enabled:
        robot_state["status"] = "idle"
        robot_state["speed"] = 0

    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Motor {'enabled' if request.enabled else 'disabled'}",
        "motor_enabled": robot_state["motor_enabled"],
        "status": "success"
    }


@app.post("/camera/move")
async def move_camera(request: CameraRequest):
    """Move camera pan/tilt"""
    if request.pan is not None:
        if not -180 <= request.pan <= 180:
            raise HTTPException(status_code=400, detail="Pan must be between -180 and 180")
        robot_state["camera"]["pan"] = request.pan

    if request.tilt is not None:
        if not -90 <= request.tilt <= 90:
            raise HTTPException(status_code=400, detail="Tilt must be between -90 and 90")
        robot_state["camera"]["tilt"] = request.tilt

    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": "Camera position updated",
        "camera": robot_state["camera"],
        "status": "success"
    }


@app.post("/arm/position")
async def set_arm_position(request: ArmPositionRequest):
    """Set arm height (0-100 cm)"""
    if not 0 <= request.height <= 100:
        raise HTTPException(status_code=400, detail="Height must be between 0 and 100 cm")

    robot_state["arm"]["height"] = request.height
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Arm height set to {request.height} cm",
        "arm": robot_state["arm"],
        "status": "success"
    }


@app.post("/arm/gripper")
async def set_gripper(request: GripperRequest):
    """Open/close gripper"""
    robot_state["arm"]["gripper_open"] = request.open
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": f"Gripper {'opened' if request.open else 'closed'}",
        "gripper_open": robot_state["arm"]["gripper_open"],
        "status": "success"
    }


@app.get("/sensors")
async def get_sensors():
    """Get sensor readings"""
    return {
        "sensors": robot_state["sensors"],
        "battery": robot_state["battery"],
        "timestamp": datetime.now().isoformat(),
        "status": "success"
    }


@app.post("/stop")
async def emergency_stop():
    """Emergency stop - halt all operations"""
    robot_state["status"] = "idle"
    robot_state["speed"] = 0
    robot_state["motor_enabled"] = False
    robot_state["last_command"] = "emergency_stop"
    robot_state["last_updated"] = datetime.now().isoformat()

    return {
        "message": "⚠️ EMERGENCY STOP ACTIVATED",
        "status": "stopped",
        "all_systems": "halted"
    }


@app.post("/reset")
async def reset_robot():
    """Reset robot to initial state"""
    global robot_state

    robot_state = {
        "position": {"x": 0, "y": 0, "heading": 0},
        "speed": 50,
        "battery": 85,
        "lights": False,
        "motor_enabled": True,
        "camera": {"pan": 0, "tilt": 0},
        "arm": {"height": 50, "gripper_open": True},
        "sensors": {
            "temperature": 22.5,
            "distance_front": 150,
            "distance_back": 200
        },
        "status": "idle",
        "last_command": None,
        "last_updated": datetime.now().isoformat()
    }

    return {
        "message": "Robot reset to initial state",
        "status": "success"
    }


if __name__ == "__main__":
    import uvicorn
    print("🤖 Starting Test Robot API...")
    print("📖 Documentation: http://localhost:8001/docs")
    print("🔧 OpenAPI JSON: http://localhost:8001/openapi.json")
    uvicorn.run(app, host="0.0.0.0", port=8001)
