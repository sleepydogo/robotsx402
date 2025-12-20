from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database (defaults to SQLite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./x402_platform.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Solana
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_NETWORK: str = "devnet"
    STABLECOIN_MINT: str = "8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX"

    # Session
    SESSION_EXPIRE_MINUTES: int = 15

    # API
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "x402 Payment Platform"

    # AI Integration
    ANTHROPIC_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "https://robotsx402.fun,https://www.robotsx402.fun,http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
