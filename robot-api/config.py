"""
Configuration settings for the Chess Robotic Arm API
Uses Pydantic Settings for environment variable management
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    RELOAD: bool = True

    # Security
    API_KEYS: List[str] = ["as129skaSF1"]  # Default key for development/testing

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    # Camera Configuration
    CAMERA_INDEX: int = 0  # Default webcam (0 = primary camera)
    CAMERA_WIDTH: int = 640
    CAMERA_HEIGHT: int = 480
    CAMERA_FPS: int = 30
    JPEG_QUALITY: int = 80  # JPEG compression quality (0-100)

    # Robotic Arm Configuration
    CSV_MATRIX_PATH: str = "/Users/tom/solana-quantum/robot-api/rutinas-movimiento.csv"
    SERIAL_BAUDRATE: int = 9600
    SERIAL_TIMEOUT: float = 3.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()
