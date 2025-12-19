from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class GPSCoordinates(BaseModel):
    lat: float
    lng: float


class RentalPlan(BaseModel):
    duration_minutes: int
    price: float
    name: Optional[str] = None


class RobotBase(BaseModel):
    name: str
    category: str = "general"  # general | chess | drone | arm | etc.
    description: Optional[str] = None
    price: float
    currency: str = "USDC"
    wallet_address: str
    image_url: Optional[str] = None
    services: List[str]
    endpoint: str
    control_api_url: Optional[str] = None
    control_api_key: Optional[str] = None  # API key for control API (never exposed in responses)
    video_stream_url: Optional[str] = None
    has_gps: bool = False
    gps_coordinates: Optional[GPSCoordinates] = None
    interface_config: Optional[Dict[str, Any]] = None
    rental_plans: Optional[List[RentalPlan]] = None


class RobotCreate(RobotBase):
    pass


class RobotUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    wallet_address: Optional[str] = None
    image_url: Optional[str] = None
    services: Optional[List[str]] = None
    endpoint: Optional[str] = None
    status: Optional[str] = None
    control_api_url: Optional[str] = None
    control_api_key: Optional[str] = None  # API key for control API
    video_stream_url: Optional[str] = None
    has_gps: Optional[bool] = None
    gps_coordinates: Optional[GPSCoordinates] = None
    interface_config: Optional[Dict[str, Any]] = None
    rental_plans: Optional[List[RentalPlan]] = None


class RobotMetrics(BaseModel):
    total_executions: int
    total_revenue: float
    avg_response_time: float
    success_rate: float


class RobotResponse(RobotBase):
    id: str
    owner_id: str
    category: str  # Explicitly include category
    status: str
    execution_count: int
    total_revenue: float
    avg_response_time: float
    success_rate: float
    created_at: datetime
    control_api_url: Optional[str] = None
    video_stream_url: Optional[str] = None
    has_gps: bool = False
    gps_coordinates: Optional[GPSCoordinates] = None
    interface_config: Optional[Dict[str, Any]] = None
    rental_plans: Optional[List[RentalPlan]] = None

    class Config:
        from_attributes = True


class RobotListResponse(BaseModel):
    robots: List[RobotResponse]
    total: int


class APIExploreRequest(BaseModel):
    api_url: str
    robot_name: str
    has_video: bool = False
    has_gps: bool = False


class APIExploreResponse(BaseModel):
    interface_config: Dict[str, Any]
