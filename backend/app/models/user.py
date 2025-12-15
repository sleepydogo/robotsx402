from sqlalchemy import Column, String, Numeric, DateTime
from datetime import datetime
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_address = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="user")  # user | robot_owner | admin
    total_spent = Column(Numeric(20, 6), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.wallet_address} ({self.role})>"
