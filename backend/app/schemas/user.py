from pydantic import BaseModel
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    wallet_address: str
    role: str
    total_spent: float
    created_at: datetime

    class Config:
        from_attributes = True


class WalletLogin(BaseModel):
    wallet_address: str
    signature: str
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
