import hashlib
import re
import secrets
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.db.models import User
from app.services.github_oauth import (
    CALLBACK_PATH,
    GitHubOAuthError,
    GitHubProfile,
    authorization_url,
    fetch_profile,
)

router = APIRouter(tags=["auth"])
OAUTH_COOKIE = "repoatlas_oauth_browser"
SESSION_COOKIE = "repoatlas_session"
OAUTH_TTL_SECONDS = 600
SESSION_TTL_SECONDS = 24 * 60 * 60
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}")
AUTH_HEADERS = {"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}


class CurrentUser(BaseModel):
    id: UUID
    github_id: int
    login: str
    avatar_url: str | None


def auth_error(status_code: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail, headers=AUTH_HEADERS)


def oauth_key(state: str, browser_nonce: str) -> str:
    digest = hashlib.sha256(f"{state}:{browser_nonce}".encode("ascii")).hexdigest()
    return f"repoatlas:oauth:{digest}"


def session_key(session_id: str) -> str:
    digest = hashlib.sha256(session_id.encode("ascii")).hexdigest()
    return f"repoatlas:session:{digest}"


def oauth_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    if not settings.github_client_id or not settings.github_client_secret.get_secret_value():
        raise auth_error(503, "GitHub sign-in is not configured")
    return settings


async def save_github_user(
    sessions: async_sessionmaker[AsyncSession], profile: GitHubProfile
) -> UUID:
    avatar_url = str(profile.avatar_url) if profile.avatar_url else None
    statement = (
        insert(User)
        .values(github_id=profile.id, login=profile.login, avatar_url=avatar_url)
        .on_conflict_do_update(
            index_elements=[User.github_id],
            set_={"login": profile.login, "avatar_url": avatar_url},
        )
        .returning(User.id)
    )
    async with sessions.begin() as session:
        result = await session.execute(statement)
        user_id = result.scalar_one()
    return user_id


@router.get("/api/v1/auth/github/login")
async def github_login(request: Request) -> RedirectResponse:
    settings = oauth_settings(request)
    redis_client: Redis = request.app.state.redis_client
    state = secrets.token_urlsafe(32)
    browser_nonce = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(32)

    try:
        stored = await redis_client.set(
            oauth_key(state, browser_nonce), verifier, ex=OAUTH_TTL_SECONDS, nx=True
        )
    except RedisError:
        raise auth_error(503, "Sign-in is temporarily unavailable") from None
    if not stored:
        raise auth_error(503, "Could not start sign-in. Please try again.")

    response = RedirectResponse(
        authorization_url(settings, state, verifier), status_code=302, headers=AUTH_HEADERS
    )
    response.set_cookie(
        OAUTH_COOKIE,
        browser_nonce,
        max_age=OAUTH_TTL_SECONDS,
        path=CALLBACK_PATH,
        httponly=True,
        secure=settings.api_origin.scheme == "https",
        samesite="lax",
    )
    return response


@router.get(CALLBACK_PATH)
async def github_callback(request: Request) -> RedirectResponse:
    settings = oauth_settings(request)
    redis_client: Redis = request.app.state.redis_client
    state = request.query_params.get("state", "")
    code = request.query_params.get("code", "")
    browser_nonce = request.cookies.get(OAUTH_COOKIE, "")

    if not TOKEN_PATTERN.fullmatch(state) or not TOKEN_PATTERN.fullmatch(browser_nonce):
        raise auth_error(400, "Invalid sign-in attempt. Start sign-in again.")

    try:
        verifier = await redis_client.getdel(oauth_key(state, browser_nonce))
        if isinstance(verifier, bytes):
            verifier = verifier.decode("ascii", errors="replace")
        if not isinstance(verifier, str) or not TOKEN_PATTERN.fullmatch(verifier):
            raise auth_error(400, "Sign-in attempt is invalid or expired. Start again.")
        if not code or len(code) > 1024:
            raise auth_error(400, "GitHub did not return a valid authorization code")

        profile = await fetch_profile(settings, code, verifier)
        sessions: async_sessionmaker[AsyncSession] = request.app.state.session_factory
        user_id = await save_github_user(sessions, profile)
        session_id = secrets.token_urlsafe(32)
        stored = await redis_client.set(
            session_key(session_id), str(user_id), ex=SESSION_TTL_SECONDS, nx=True
        )
    except RedisError:
        raise auth_error(503, "Sign-in is temporarily unavailable") from None
    except GitHubOAuthError:
        raise auth_error(502, "GitHub sign-in could not be completed") from None

    if not stored:
        raise auth_error(503, "Could not create a session. Please sign in again.")

    secure = settings.api_origin.scheme == "https"
    response = RedirectResponse(str(settings.web_origin), status_code=303, headers=AUTH_HEADERS)
    response.delete_cookie(OAUTH_COOKIE, path=CALLBACK_PATH, secure=secure, httponly=True)
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        max_age=SESSION_TTL_SECONDS,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    return response


@router.get("/api/v1/me")
async def get_current_user(request: Request, response: Response) -> CurrentUser:
    session_id = request.cookies.get(SESSION_COOKIE, "")
    if not TOKEN_PATTERN.fullmatch(session_id):
        raise auth_error(401, "Sign in required")

    redis_client: Redis = request.app.state.redis_client
    try:
        user_id = await redis_client.get(session_key(session_id))
    except RedisError:
        raise auth_error(503, "Session service is temporarily unavailable") from None

    if isinstance(user_id, bytes):
        user_id = user_id.decode("ascii", errors="replace")
    if not isinstance(user_id, str):
        raise auth_error(401, "Session expired. Sign in again.")
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise auth_error(401, "Invalid session. Sign in again.") from None

    sessions: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with sessions() as session:
        user = await session.get(User, user_uuid)
        if user is None:
            raise auth_error(401, "Invalid session. Sign in again.")
        profile = CurrentUser(
            id=user.id, github_id=user.github_id, login=user.login, avatar_url=user.avatar_url
        )

    response.headers.update(AUTH_HEADERS)
    return profile


def require_trusted_origin(request: Request) -> None:
    settings: Settings = request.app.state.settings
    allowed_origins = {
        str(settings.web_origin).rstrip("/"),
        str(settings.api_origin).rstrip("/"),
    }
    if request.headers.get("origin") not in allowed_origins:
        raise auth_error(403, "Untrusted request origin")


@router.post("/api/v1/auth/logout", status_code=204)
async def logout(request: Request) -> Response:
    require_trusted_origin(request)
    settings: Settings = request.app.state.settings
    session_id = request.cookies.get(SESSION_COOKIE, "")
    if TOKEN_PATTERN.fullmatch(session_id):
        redis_client: Redis = request.app.state.redis_client
        try:
            await redis_client.delete(session_key(session_id))
        except RedisError:
            raise auth_error(503, "Session service is temporarily unavailable") from None

    response = Response(status_code=204, headers=AUTH_HEADERS)
    response.delete_cookie(
        SESSION_COOKIE, path="/", httponly=True, secure=settings.api_origin.scheme == "https"
    )
    return response
