from base64 import urlsafe_b64encode
from dataclasses import dataclass
from hashlib import sha256
from unittest.mock import AsyncMock, MagicMock, Mock
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import AnyHttpUrl, SecretStr

from app.api.v1 import auth
from app.core.config import Settings
from app.db.models import User
from app.main import create_app
from app.services.github_oauth import CALLBACK_PATH, GitHubProfile

WEB_ORIGIN = "http://localhost:3000"
API_ORIGIN = "http://localhost:8000"
LOGIN_PATH = "/api/v1/auth/github/login"
ME_PATH = "/api/v1/me"
LOGOUT_PATH = "/api/v1/auth/logout"


class FakeRedis:
    def __init__(self) -> None:
        self.entries: dict[str, tuple[str, int]] = {}

    async def set(self, key: str, value: str, *, ex: int, nx: bool) -> bool:
        if nx and key in self.entries:
            return False
        self.entries[key] = (value, ex)
        return True

    async def get(self, key: str) -> bytes | None:
        entry = self.entries.get(key)
        return entry[0].encode("ascii") if entry else None

    async def getdel(self, key: str) -> bytes | None:
        entry = self.entries.pop(key, None)
        return entry[0].encode("ascii") if entry else None

    async def delete(self, key: str) -> int:
        return int(self.entries.pop(key, None) is not None)


@dataclass
class AuthFixture:
    app: FastAPI
    redis: FakeRedis
    user: User
    fetch_profile: AsyncMock


@pytest.fixture
def auth_fixture(monkeypatch: pytest.MonkeyPatch) -> AuthFixture:
    settings = Settings(
        _env_file=None,
        web_origin=AnyHttpUrl(WEB_ORIGIN),
        api_origin=AnyHttpUrl(API_ORIGIN),
        github_client_id="test-client",
        github_client_secret=SecretStr("test-secret"),
    )
    app = create_app(settings)
    redis = FakeRedis()
    user = User(id=uuid4(), github_id=123, login="example", avatar_url=None)
    fetch_profile = AsyncMock(return_value=GitHubProfile(id=user.github_id, login=user.login))
    monkeypatch.setattr(auth, "fetch_profile", fetch_profile)
    monkeypatch.setattr(auth, "save_github_user", AsyncMock(return_value=user.id))

    session = Mock(get=AsyncMock(return_value=user))
    session_context = MagicMock()
    session_context.__aenter__.return_value = session
    app.state.redis_client = redis
    app.state.session_factory = Mock(return_value=session_context)
    return AuthFixture(app, redis, user, fetch_profile)


def browser(app: FastAPI) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url=API_ORIGIN)


async def test_sign_in_refresh_and_logout(auth_fixture: AuthFixture) -> None:
    async with browser(auth_fixture.app) as client:
        login = await client.get(LOGIN_PATH)
        assert login.status_code == 302
        params = parse_qs(urlsplit(login.headers["location"]).query)
        state = params["state"][0]
        nonce = client.cookies[auth.OAUTH_COOKIE]
        verifier, ttl = auth_fixture.redis.entries[auth.oauth_key(state, nonce)]
        challenge = urlsafe_b64encode(sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        assert ttl == 600
        assert params["code_challenge"] == [challenge]
        assert params["code_challenge_method"] == ["S256"]

        callback = await client.get(CALLBACK_PATH, params={"state": state, "code": "test-code"})
        assert callback.status_code == 303
        assert callback.headers["location"] == f"{WEB_ORIGIN}/"
        assert "HttpOnly" in callback.headers["set-cookie"]
        session_id = client.cookies[auth.SESSION_COOKIE]
        session_key = auth.session_key(session_id)
        assert auth_fixture.redis.entries[session_key] == (str(auth_fixture.user.id), 86400)

        for _ in range(2):
            me = await client.get(ME_PATH, headers={"Origin": WEB_ORIGIN})
            assert me.status_code == 200
            assert me.json() == {
                "id": str(auth_fixture.user.id),
                "github_id": 123,
                "login": "example",
                "avatar_url": None,
            }
            assert me.headers["cache-control"] == "no-store"
            assert me.headers["access-control-allow-origin"] == WEB_ORIGIN
            assert me.headers["access-control-allow-credentials"] == "true"

        logout = await client.post(LOGOUT_PATH, headers={"Origin": WEB_ORIGIN})
        assert logout.status_code == 204
        assert session_key not in auth_fixture.redis.entries
        assert auth.SESSION_COOKIE not in client.cookies
        client.cookies.set(auth.SESSION_COOKIE, session_id)
        assert (await client.get(ME_PATH)).status_code == 401


async def test_state_is_browser_bound_and_single_use(auth_fixture: AuthFixture) -> None:
    async with browser(auth_fixture.app) as original, browser(auth_fixture.app) as other:
        login = await original.get(LOGIN_PATH)
        state = parse_qs(urlsplit(login.headers["location"]).query)["state"][0]
        nonce = original.cookies[auth.OAUTH_COOKIE]
        params = {"state": state, "code": "test-code"}
        other.cookies.set(auth.OAUTH_COOKIE, "z" * 43)
        assert (await other.get(CALLBACK_PATH, params=params)).status_code == 400
        assert (await original.get(CALLBACK_PATH, params=params)).status_code == 303
        original.cookies.set(auth.OAUTH_COOKIE, nonce)
        assert (await original.get(CALLBACK_PATH, params=params)).status_code == 400
        auth_fixture.fetch_profile.assert_awaited_once()


@pytest.mark.parametrize("origin", [None, "null", "http://localhost:3001"])
async def test_logout_rejects_bad_origin(auth_fixture: AuthFixture, origin: str | None) -> None:
    session_id = "s" * 43
    key = auth.session_key(session_id)
    auth_fixture.redis.entries[key] = (str(auth_fixture.user.id), 86400)
    async with browser(auth_fixture.app) as client:
        client.cookies.set(auth.SESSION_COOKIE, session_id)
        headers = {"Origin": origin} if origin is not None else {}
        assert (await client.post(LOGOUT_PATH, headers=headers)).status_code == 403
        assert key in auth_fixture.redis.entries


async def test_me_rejects_expired_session(auth_fixture: AuthFixture) -> None:
    async with browser(auth_fixture.app) as client:
        client.cookies.set(auth.SESSION_COOKIE, "s" * 43)
        assert (await client.get(ME_PATH)).status_code == 401
