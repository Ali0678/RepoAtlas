from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.core.config import Settings
from app.core.connections import connected_services


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        async with connected_services(configuration) as (engine, redis_client):
            application.state.session_factory = async_sessionmaker(engine, expire_on_commit=False)
            application.state.redis_client = redis_client
            try:
                yield
            finally:
                del application.state.redis_client
                del application.state.session_factory

    app = FastAPI(
        title="RepoAtlas API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(configuration.web_origin).rstrip("/")],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)

    return app
