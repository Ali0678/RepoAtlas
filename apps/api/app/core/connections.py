import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg
from redis.asyncio import Redis

from app.core.config import Settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def connected_services(settings: Settings) -> AsyncIterator[None]:
    database_url = str(settings.database_url).replace(
        "postgresql+asyncpg://",
        "postgresql://",
        1,
    )

    pool = await asyncpg.create_pool(
        dsn=database_url,
        min_size=1,
        max_size=5,
        timeout=5,
        command_timeout=5,
        record_class=asyncpg.Record,
    )

    try:
        redis_client = Redis.from_url(
            str(settings.redis_url),
            socket_connect_timeout=5,
            socket_timeout=5,
        )

        try:
            async with asyncio.timeout(10):
                result = await pool.fetchval("SELECT 1")
                if result != 1:
                    raise RuntimeError("PostgreSQL connection check failed")

                await redis_client.ping()

            logger.info("PostgreSQL and Redis connection checks passed")

            yield
        finally:
            async with asyncio.timeout(5):
                await redis_client.aclose()
    finally:
        async with asyncio.timeout(5):
            await pool.close()
