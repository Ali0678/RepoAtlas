import asyncio
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock, Mock

import pytest

from app.core import connections
from app.core.config import Settings


@dataclass
class Clients:
    engine: MagicMock
    connection: Mock
    redis: Mock
    redis_factory: Mock


@pytest.fixture
def clients(monkeypatch: pytest.MonkeyPatch) -> Clients:
    connection = Mock(scalar=AsyncMock(return_value=1))
    engine = MagicMock(dispose=AsyncMock())
    engine.connect.return_value.__aenter__.return_value = connection
    redis = Mock(ping=AsyncMock(return_value=True), aclose=AsyncMock())
    redis_factory = Mock(return_value=redis)
    monkeypatch.setattr(connections, "create_database_engine", Mock(return_value=engine))
    monkeypatch.setattr("app.core.connections.Redis.from_url", redis_factory)
    return Clients(engine, connection, redis, redis_factory)


async def test_connections_stay_open_until_context_exits(clients: Clients) -> None:
    async with connections.connected_services(Settings(_env_file=None)) as engine:
        assert engine is clients.engine
        clients.connection.scalar.assert_awaited_once()
        assert str(clients.connection.scalar.call_args.args[0]) == "SELECT 1"
        clients.engine.connect.return_value.__aexit__.assert_awaited_once()
        clients.redis.ping.assert_awaited_once()
        clients.engine.dispose.assert_not_awaited()
        clients.redis.aclose.assert_not_awaited()
    clients.redis.aclose.assert_awaited_once()
    clients.engine.dispose.assert_awaited_once()


@pytest.mark.parametrize("failure", ["connect", "query", "unexpected_result"])
async def test_database_failure_disposes_engine(clients: Clients, failure: str) -> None:
    if failure == "connect":
        clients.engine.connect.return_value.__aenter__.side_effect = RuntimeError("connect failed")
    elif failure == "query":
        clients.connection.scalar.side_effect = RuntimeError("query failed")
    else:
        clients.connection.scalar.return_value = 0

    with pytest.raises(RuntimeError):
        async with connections.connected_services(Settings(_env_file=None)):
            pytest.fail("Startup should not succeed")
    clients.redis_factory.assert_not_called()
    clients.engine.dispose.assert_awaited_once()


@pytest.mark.parametrize("failure", ["redis", "body"])
async def test_failures_close_both_clients(clients: Clients, failure: str) -> None:
    if failure == "redis":
        clients.redis.ping.side_effect = RuntimeError("redis failed")

    with pytest.raises(RuntimeError):
        async with connections.connected_services(Settings(_env_file=None)):
            if failure == "body":
                raise RuntimeError("application failed")
            pytest.fail("Startup should not succeed")
    clients.redis.aclose.assert_awaited_once()
    clients.engine.dispose.assert_awaited_once()


async def test_redis_constructor_failure_disposes_engine(clients: Clients) -> None:
    clients.redis_factory.side_effect = ValueError("invalid Redis configuration")
    with pytest.raises(ValueError, match="invalid Redis"):
        async with connections.connected_services(Settings(_env_file=None)):
            pytest.fail("Startup should not succeed")
    clients.engine.dispose.assert_awaited_once()


async def test_redis_cleanup_failure_still_disposes_engine(clients: Clients) -> None:
    clients.redis.aclose.side_effect = RuntimeError("cleanup failed")
    with pytest.raises(RuntimeError, match="cleanup failed"):
        async with connections.connected_services(Settings(_env_file=None)):
            pass
    clients.engine.dispose.assert_awaited_once()


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
    clients.engine.dispose.assert_awaited_once()
