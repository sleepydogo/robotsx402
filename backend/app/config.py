from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Solana
    SOLANA_RPC_URL: str
    SOLANA_NETWORK: str = "devnet"
    STABLECOIN_MINT: str

    # Session
    SESSION_EXPIRE_MINUTES: int = 15

    # API
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "x402 Payment Platform"

    # AI Integration
    ANTHROPIC_API_KEY: str

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
