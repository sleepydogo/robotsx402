from sqlalchemy import Column, String, Numeric, Integer, Float, DateTime, Text, ForeignKey, JSON
from datetime import datetime
import uuid
from app.database import Base


class Robot(Base):
    __tablename__ = "robots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), default="general")  # general | chess | drone | arm | etc.
    description = Column(Text, nullable=True)
    price = Column(Numeric(20, 6), nullable=False)
    currency = Column(String(10), default="USDC")
    wallet_address = Column(String(255), nullable=False)
    image_url = Column(String(500), nullable=True)  # Robot image URL
    services = Column(JSON, nullable=False)  # List of service types
    endpoint = Column(String(500), nullable=False)  # Where the robot service runs
    status = Column(String(50), default="active")  # active | inactive | maintenance
    execution_count = Column(Integer, default=0)
    total_revenue = Column(Numeric(20, 6), default=0)
    avg_response_time = Column(Float, default=0.0)
    success_rate = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # AI-powered control interface fields
    control_api_url = Column(String(500), nullable=True)  # URL of the robot control API
    control_api_key = Column(String(500), nullable=True)  # API key for robot control API (encrypted)
    video_stream_url = Column(String(500), nullable=True)  # URL for video streaming
    has_gps = Column(Integer, default=0)  # Boolean: 1 if robot has GPS tracking
    gps_coordinates = Column(JSON, nullable=True)  # {"lat": float, "lng": float}
    interface_config = Column(JSON, nullable=True)  # AI-generated control interface configuration
    rental_plans = Column(JSON, nullable=True)  # [{"duration_minutes": 30, "price": 5.0, "name": "30 min"}]

    def __repr__(self):
        return f"<Robot {self.name} (${self.price})>"
