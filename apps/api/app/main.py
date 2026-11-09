from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.health import router as health_router
from app.core.config import Settings
from app.core.connections import connected_services


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        async with connected_services(configuration):
            yield

    app = FastAPI(
        title="RepoAtlas API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = configuration
    app.include_router(health_router)

    return app
