import asyncio
from dataclasses import dataclass
from unittest.mock import AsyncMock, Mock

import pytest

from app.core import connections
from app.core.config import Settings


@dataclass
class Clients:
    pool: Mock
    redis: Mock
    create_pool: AsyncMock
    redis_factory: Mock


@pytest.fixture
def clients(monkeypatch: pytest.MonkeyPatch) -> Clients:
    pool = Mock(fetchval=AsyncMock(return_value=1), close=AsyncMock())
    redis = Mock(ping=AsyncMock(return_value=True), aclose=AsyncMock())
    create_pool = AsyncMock(return_value=pool)
    redis_factory = Mock(return_value=redis)
    monkeypatch.setattr("app.core.connections.asyncpg.create_pool", create_pool)
    monkeypatch.setattr("app.core.connections.Redis.from_url", redis_factory)
    return Clients(pool, redis, create_pool, redis_factory)


async def test_connections_stay_open_until_context_exits(clients: Clients) -> None:
    async with connections.connected_services(Settings(_env_file=None)):
        clients.pool.fetchval.assert_awaited_once_with("SELECT 1")
        clients.redis.ping.assert_awaited_once()
        clients.pool.close.assert_not_awaited()
        clients.redis.aclose.assert_not_awaited()
    clients.redis.aclose.assert_awaited_once()
    clients.pool.close.assert_awaited_once()
    assert clients.create_pool.call_args.kwargs["dsn"].startswith("postgresql://")


@pytest.mark.parametrize("failure", ["query", "unexpected_result", "redis", "body"])
async def test_failures_close_both_clients(clients: Clients, failure: str) -> None:
    if failure == "query":
        clients.pool.fetchval.side_effect = RuntimeError("query failed")
    elif failure == "unexpected_result":
        clients.pool.fetchval.return_value = 0
    elif failure == "redis":
        clients.redis.ping.side_effect = RuntimeError("redis failed")

    with pytest.raises(RuntimeError):
        async with connections.connected_services(Settings(_env_file=None)):
            if failure == "body":
                raise RuntimeError("application failed")
            pytest.fail("Startup should not succeed")
    clients.redis.aclose.assert_awaited_once()
    clients.pool.close.assert_awaited_once()


async def test_database_failure_does_not_create_redis(clients: Clients) -> None:
    clients.create_pool.side_effect = ConnectionError("database unavailable")
    with pytest.raises(ConnectionError, match="database unavailable"):
        async with connections.connected_services(Settings(_env_file=None)):
            pytest.fail("Startup should not succeed")
    clients.redis_factory.assert_not_called()


async def test_redis_constructor_failure_closes_database(clients: Clients) -> None:
    clients.redis_factory.side_effect = ValueError("invalid Redis configuration")
    with pytest.raises(ValueError, match="invalid Redis"):
        async with connections.connected_services(Settings(_env_file=None)):
            pytest.fail("Startup should not succeed")
    clients.pool.close.assert_awaited_once()


async def test_redis_cleanup_failure_still_closes_database(clients: Clients) -> None:
    clients.redis.aclose.side_effect = RuntimeError("cleanup failed")
    with pytest.raises(RuntimeError, match="cleanup failed"):
        async with connections.connected_services(Settings(_env_file=None)):
            pass
    clients.pool.close.assert_awaited_once()


async def test_cancellation_closes_both_clients(clients: Clients) -> None:
    entered = asyncio.Event()

    async def run() -> None:
        async with connections.connected_services(Settings(_env_file=None)):
            entered.set()
            await asyncio.Event().wait()

    async with asyncio.timeout(2):
        task = asyncio.create_task(run())
        try:
            await entered.wait()
        finally:
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    clients.redis.aclose.assert_awaited_once()
    clients.pool.close.assert_awaited_once()
