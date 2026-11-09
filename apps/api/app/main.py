from fastapi import FastAPI

from app.api.v1.health import router as health_router
from app.core.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()

    app = FastAPI(title="RepoAtlas API", version="0.1.0")
    app.state.settings = configuration
    app.include_router(health_router)

    return app
