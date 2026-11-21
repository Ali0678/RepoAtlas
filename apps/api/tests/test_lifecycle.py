import asyncio
import signal
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock

import pytest
from arq.connections import ArqRedis
from arq.worker import Worker
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine

from app import main as api_main
from app.core.config import Settings
from app.workers import main as worker


@pytest.mark.parametrize("fails", [False, True])
async def test_api_lifespan_controls_service_context(
    monkeypatch: pytest.MonkeyPatch, fails: bool
) -> None:
    events: list[str] = []
    settings = Settings(_env_file=None)
    engine = Mock(spec=AsyncEngine)
    redis_client = Mock(spec=Redis)

    @asynccontextmanager
    async def services(configuration: Settings) -> AsyncIterator[tuple[AsyncEngine, Redis]]:
        assert configuration is settings
        events.append("starting")
        if fails:
            raise ConnectionError("services unavailable")
        try:
            yield engine, redis_client
        finally:
            events.append("closed")

    monkeypatch.setattr(api_main, "connected_services", services)
    application = api_main.create_app(settings)
    if fails:
        with pytest.raises(ConnectionError, match="services unavailable"):
            async with application.router.lifespan_context(application):
                pytest.fail("Application must not start")
        assert events == ["starting"]
    else:
        async with application.router.lifespan_context(application):
            assert application.state.redis_client is redis_client
            async with AsyncClient(
                transport=ASGITransport(app=application), base_url="http://test"
            ) as client:
                assert (await client.get("/health")).json() == {"status": "ok"}
            assert events == ["starting"]
        assert events == ["starting", "closed"]
        assert not hasattr(application.state, "redis_client")


@pytest.mark.parametrize("fails", [False, True])
async def test_worker_shutdown_and_signal_cleanup(
    monkeypatch: pytest.MonkeyPatch, fails: bool
) -> None:
    ready = asyncio.Event()
    events: list[str] = []
    loop = asyncio.get_running_loop()
    register = Mock()
    unregister = Mock()
    monkeypatch.setattr(loop, "add_signal_handler", register)
    monkeypatch.setattr(loop, "remove_signal_handler", unregister)
    monkeypatch.setattr(worker, "Settings", lambda: Settings(_env_file=None))
    engine = Mock(spec=AsyncEngine)
    redis_client = Mock(spec=ArqRedis, delete=AsyncMock(), close=AsyncMock())

    @asynccontextmanager
    async def services(configuration: Settings) -> AsyncIterator[tuple[AsyncEngine, ArqRedis]]:
        if fails:
            raise ConnectionError("worker startup failed")
        try:
            yield engine, redis_client
        finally:
            events.append("closed")

    async def run_worker(consumer: Worker) -> None:
        assert consumer.pool is redis_client
        assert list(consumer.functions) == ["analyze_repository"]
        events.append("ready")
        ready.set()
        await asyncio.Future()

    monkeypatch.setattr(worker, "connected_services", services)
    monkeypatch.setattr(Worker, "main", run_worker)
    if fails:
        with pytest.raises(ConnectionError, match="worker startup failed"):
            await worker.main()
        register.assert_not_called()
        unregister.assert_not_called()
    else:
        async with asyncio.timeout(2):
            task = asyncio.create_task(worker.main())
            try:
                await ready.wait()
                assert not task.done()
                callbacks = {call.args[0]: call.args[1] for call in register.call_args_list}
                callbacks[signal.SIGTERM]()
                await task
            finally:
                if not task.done():
                    task.cancel()
                    await asyncio.gather(task, return_exceptions=True)
        assert events == ["ready", "closed"]
        assert register.call_count == 2
        unregister.assert_any_call(signal.SIGINT)
        unregister.assert_any_call(signal.SIGTERM)
        redis_client.close.assert_awaited_once_with(close_connection_pool=True)
