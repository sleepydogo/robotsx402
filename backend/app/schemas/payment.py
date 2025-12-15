from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class PaymentVerification(BaseModel):
    session_id: str
    tx_signature: str


class PaymentVerificationResponse(BaseModel):
    verified: bool
    session_id: str
    error: Optional[str] = None


class ExecutePayload(BaseModel):
    service: str
    parameters: Dict[str, Any] = {}


class ExecuteResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None


class PaymentSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    robot_id: UUID
    amount: float
    currency: str
    recipient_address: str
    status: str
    tx_signature: Optional[str]
    created_at: datetime
    expires_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True
