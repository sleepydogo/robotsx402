from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class RobotBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USDC"
    wallet_address: str
    image_url: Optional[str] = None
    services: List[str]
    endpoint: str


class RobotCreate(RobotBase):
    pass


class RobotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    wallet_address: Optional[str] = None
    image_url: Optional[str] = None
    services: Optional[List[str]] = None
    endpoint: Optional[str] = None
    status: Optional[str] = None


class RobotMetrics(BaseModel):
    total_executions: int
    total_revenue: float
    avg_response_time: float
    success_rate: float


class RobotResponse(RobotBase):
    id: UUID
    owner_id: UUID
    status: str
    execution_count: int
    total_revenue: float
    avg_response_time: float
    success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class RobotListResponse(BaseModel):
    robots: List[RobotResponse]
    total: int
