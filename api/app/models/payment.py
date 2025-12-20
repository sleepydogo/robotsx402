from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Float, Text, JSON
from datetime import datetime
import uuid
from app.database import Base


class PaymentSessionDB(Base):
    """
    Database backup of payment sessions (Redis is primary storage)
    Used for historical records and analytics
    """
    __tablename__ = "payment_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    robot_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    amount = Column(Numeric(20, 6), nullable=False)
    currency = Column(String(10), default="USDC")
    recipient_address = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", index=True)  # pending | paid | expired
    tx_signature = Column(String(255), nullable=True)
    service_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<PaymentSession {self.id} ({self.status})>"


class ExecutionLog(Base):
    """
    Log of robot executions for metrics and debugging
    """
    __tablename__ = "execution_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("payment_sessions.id"), nullable=True)
    robot_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # success | error | timeout
    response_time = Column(Float, nullable=True)  # in seconds
    error = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ExecutionLog {self.robot_id} ({self.status})>"
