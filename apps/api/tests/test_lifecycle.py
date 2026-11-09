import asyncio
import signal
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import Mock

import pytest
from httpx import ASGITransport, AsyncClient

from app import main as api_main
from app.core.config import Settings
from app.workers import main as worker


@pytest.mark.parametrize("fails", [False, True])
async def test_api_lifespan_controls_service_context(
    monkeypatch: pytest.MonkeyPatch, fails: bool
) -> None:
    events: list[str] = []
    settings = Settings(_env_file=None)

    @asynccontextmanager
    async def services(configuration: Settings) -> AsyncIterator[None]:
        assert configuration is settings
        events.append("starting")
        if fails:
            raise ConnectionError("services unavailable")
        try:
            yield
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
            async with AsyncClient(
                transport=ASGITransport(app=application), base_url="http://test"
            ) as client:
                assert (await client.get("/health")).json() == {"status": "ok"}
            assert events == ["starting"]
        assert events == ["starting", "closed"]


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

    @asynccontextmanager
    async def services(configuration: Settings) -> AsyncIterator[None]:
        if fails:
            raise ConnectionError("worker startup failed")
        try:
            events.append("ready")
            ready.set()
            yield
        finally:
            events.append("closed")

    monkeypatch.setattr(worker, "connected_services", services)
    if fails:
        with pytest.raises(ConnectionError, match="worker startup failed"):
            await worker.main()
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
