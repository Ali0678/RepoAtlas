import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings
from app.db.session import create_database_engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def connected_services(settings: Settings) -> AsyncIterator[AsyncEngine]:
    engine = create_database_engine(str(settings.database_url))
    try:
        async with asyncio.timeout(10), engine.connect() as connection:
            if await connection.scalar(text("SELECT 1")) != 1:
                raise RuntimeError("PostgreSQL connection check failed")

        redis_client = Redis.from_url(
            str(settings.redis_url),
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        try:
            async with asyncio.timeout(10):
                await redis_client.ping()

            logger.info("PostgreSQL and Redis connection checks passed")
            yield engine
        finally:
            async with asyncio.timeout(5):
                await redis_client.aclose()
    finally:
        async with asyncio.timeout(5):
            await engine.dispose()
