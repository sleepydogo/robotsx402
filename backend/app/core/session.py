import json
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from app.config import settings
import uuid


class PaymentSession(BaseModel):
    id: str
    user_id: str
    robot_id: str
    amount: float
    currency: str = "USDC"
    recipient_address: str
    status: str = "pending"  # pending | paid | expired
    tx_signature: Optional[str] = None
    service_payload: dict
    created_at: datetime
    expires_at: datetime
    paid_at: Optional[datetime] = None


class PaymentSessionManager:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )

    async def create_session(
        self,
        user_id: str,
        robot_id: str,
        amount: float,
        recipient_address: str,
        service_payload: dict,
    ) -> PaymentSession:
        """Create a new payment session"""
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

        session = PaymentSession(
            id=session_id,
            user_id=user_id,
            robot_id=robot_id,
            amount=amount,
            recipient_address=recipient_address,
            service_payload=service_payload,
            created_at=now,
            expires_at=expires_at,
        )

        # Store in Redis with TTL
        await self.redis_client.setex(
            f"session:{session_id}",
            settings.SESSION_EXPIRE_MINUTES * 60,
            session.model_dump_json(),
        )

        return session

    async def get_session(self, session_id: str) -> Optional[PaymentSession]:
        """Retrieve a payment session"""
        data = await self.redis_client.get(f"session:{session_id}")
        if not data:
            return None

        session = PaymentSession.model_validate_json(data)

        # Check if expired
        if datetime.utcnow() > session.expires_at:
            session.status = "expired"
            await self.update_session(session)

        return session

    async def update_session(self, session: PaymentSession) -> None:
        """Update an existing session"""
        await self.redis_client.setex(
            f"session:{session.id}",
            settings.SESSION_EXPIRE_MINUTES * 60,
            session.model_dump_json(),
        )

    async def mark_paid(
        self,
        session_id: str,
        tx_signature: str
    ) -> Optional[PaymentSession]:
        """Mark a session as paid"""
        session = await self.get_session(session_id)
        if not session:
            return None

        session.status = "paid"
        session.tx_signature = tx_signature
        session.paid_at = datetime.utcnow()

        await self.update_session(session)
        return session

    async def is_session_paid(self, session_id: str) -> bool:
        """Check if a session has been paid"""
        session = await self.get_session(session_id)
        return session is not None and session.status == "paid"

    async def delete_session(self, session_id: str) -> None:
        """Delete a session"""
        await self.redis_client.delete(f"session:{session_id}")

    async def cleanup_expired_sessions(self):
        """Cleanup expired sessions (called periodically)"""
        # Redis TTL handles this automatically
        pass


# Global session manager instance
session_manager: Optional[PaymentSessionManager] = None


def get_session_manager() -> PaymentSessionManager:
    """Get the global session manager instance"""
    global session_manager
    if session_manager is None:
        session_manager = PaymentSessionManager(settings.REDIS_URL)
    return session_manager
