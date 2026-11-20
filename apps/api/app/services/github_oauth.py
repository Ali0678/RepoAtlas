import asyncio
import hashlib
from base64 import urlsafe_b64encode
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel, Field, HttpUrl, SecretStr, ValidationError

from app.core.config import Settings

CALLBACK_PATH = "/api/v1/auth/github/callback"
AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
TOKEN_URL = "https://github.com/login/oauth/access_token"
PROFILE_URL = "https://api.github.com/user"
MAX_RESPONSE_BYTES = 64 * 1024


class GitHubOAuthError(Exception):
    pass


class GitHubToken(BaseModel):
    access_token: SecretStr = Field(min_length=1, max_length=2048)


class GitHubProfile(BaseModel):
    id: int = Field(strict=True, gt=0, le=2**63 - 1)
    login: str = Field(min_length=1, max_length=100)
    avatar_url: HttpUrl | None = None


def callback_url(settings: Settings) -> str:
    return f"{str(settings.api_origin).rstrip('/')}{CALLBACK_PATH}"


def authorization_url(settings: Settings, state: str, verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": callback_url(settings),
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )
    return f"{AUTHORIZE_URL}?{query}"


async def read_response(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    data: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
) -> bytes:
    async with client.stream(method, url, data=data, headers=headers) as response:
        response.raise_for_status()
        body = bytearray()
        async for chunk in response.aiter_bytes(chunk_size=8192):
            if len(body) + len(chunk) > MAX_RESPONSE_BYTES:
                raise GitHubOAuthError("GitHub returned a response that was too large")
            body.extend(chunk)
        return bytes(body)


async def fetch_profile(settings: Settings, code: str, verifier: str) -> GitHubProfile:
    try:
        async with (
            asyncio.timeout(15),
            httpx.AsyncClient(
                timeout=5.0,
                headers={"Accept": "application/json", "User-Agent": "RepoAtlas"},
            ) as client,
        ):
            token_response = await read_response(
                client,
                "POST",
                TOKEN_URL,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret.get_secret_value(),
                    "code": code,
                    "redirect_uri": callback_url(settings),
                    "code_verifier": verifier,
                },
            )
            token = GitHubToken.model_validate_json(token_response).access_token
            profile_response = await read_response(
                client,
                "GET",
                PROFILE_URL,
                headers={"Authorization": f"Bearer {token.get_secret_value()}"},
            )
            return GitHubProfile.model_validate_json(profile_response)
    except (httpx.HTTPError, ValidationError, TimeoutError) as error:
        raise GitHubOAuthError("GitHub sign-in could not be completed") from error
