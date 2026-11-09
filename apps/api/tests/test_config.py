import pytest
from pydantic import AnyHttpUrl, ValidationError

from app.core.config import Settings
from app.main import create_app


def test_settings_have_local_defaults() -> None:
    settings = Settings(_env_file=None)

    assert str(settings.web_origin) == "http://localhost:3000/"
    assert str(settings.api_origin) == "http://localhost:8000/"


def test_settings_read_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEB_ORIGIN", "https://web.example.com")
    monkeypatch.setenv("API_ORIGIN", "https://api.example.com")

    settings = Settings(_env_file=None)

    assert str(settings.web_origin) == "https://web.example.com/"
    assert str(settings.api_origin) == "https://api.example.com/"


def test_invalid_environment_prevents_app_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WEB_ORIGIN", "banana")

    with pytest.raises(ValidationError) as error:
        create_app()

    assert any(failure["loc"] == ("web_origin",) for failure in error.value.errors())


def test_app_instances_keep_separate_settings() -> None:
    first_settings = Settings(
        _env_file=None,
        web_origin=AnyHttpUrl("https://first.example.com"),
    )
    second_settings = Settings(
        _env_file=None,
        web_origin=AnyHttpUrl("https://second.example.com"),
    )

    first = create_app(settings=first_settings)
    second = create_app(settings=second_settings)

    assert first is not second
    assert first.state.settings is first_settings
    assert second.state.settings is second_settings
