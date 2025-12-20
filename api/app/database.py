from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import asyncio
import logging
import os

logger = logging.getLogger(__name__)

# Ensure database directory exists
db_path = settings.DATABASE_URL.replace('sqlite+aiosqlite:///', '')
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)
    logger.info(f"Created database directory: {db_dir}")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database with retry logic"""
    max_retries = 5
    retry_interval = 2  # seconds

    # Log the DATABASE_URL being used (mask password)
    db_url = settings.DATABASE_URL
    masked_url = db_url.replace(db_url.split('@')[0].split('://')[1], '***:***') if '@' in db_url else db_url
    logger.info(f"🔌 Connecting to database: {masked_url}")

    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to connect to database (attempt {attempt + 1}/{max_retries})...")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database connected and tables created successfully")
            return
        except Exception as e:
            logger.error(f"❌ Database connection failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                logger.info(f"⏳ Retrying in {retry_interval} seconds...")
                await asyncio.sleep(retry_interval)
            else:
                logger.error("💥 Max retries reached. Could not connect to database.")
                logger.error(f"💥 Full DATABASE_URL: {masked_url}")
                raise
