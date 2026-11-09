import os

import pytest
from fastapi import FastAPI

from app.core.config import Settings
from app.main import create_app


@pytest.fixture(autouse=True)
def isolate_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in list(os.environ):
        if name.upper() in {"WEB_ORIGIN", "API_ORIGIN"}:
            monkeypatch.delenv(name)


@pytest.fixture
def application() -> FastAPI:
    settings = Settings(_env_file=None)
    return create_app(settings=settings)
