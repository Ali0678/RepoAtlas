from pathlib import Path

from pydantic import AnyHttpUrl, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        frozen=True,
    )

    web_origin: AnyHttpUrl = AnyHttpUrl("http://localhost:3000")
    api_origin: AnyHttpUrl = AnyHttpUrl("http://localhost:8000")

    database_url: PostgresDsn = PostgresDsn(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/repoatlas"
    )
    redis_url: RedisDsn = RedisDsn("redis://localhost:6379/0")
