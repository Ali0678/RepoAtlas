import asyncio
import re
from dataclasses import dataclass
from urllib.parse import quote

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.services.github_oauth import GitHubOAuthError, read_response

REPO_URL_PATTERN = re.compile(
    r"https://github\.com/([a-z0-9-]{1,39})/([a-z0-9_.-]{1,100})/?",
    re.IGNORECASE | re.ASCII,
)
SHA_PATTERN = re.compile(r"[0-9a-f]{40}")


class GitHubRepoError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


class RepositoryMetadata(BaseModel):
    full_name: str = Field(min_length=3, max_length=140)
    private: bool = Field(strict=True)
    default_branch: str = Field(min_length=1, max_length=255)


@dataclass(frozen=True)
class ResolvedRepository:
    owner: str
    name: str
    commit_sha: str

    @property
    def url(self) -> str:
        return f"https://github.com/{self.owner}/{self.name}"


def parse_repo_url(repo_url: str) -> tuple[str, str]:
    if len(repo_url) > 512:
        raise GitHubRepoError(422, "Repository URL is too long")

    match = REPO_URL_PATTERN.fullmatch(repo_url)
    if match is None:
        raise GitHubRepoError(422, "Use a GitHub repository URL like https://github.com/owner/repo")

    owner, name = match.groups()
    name = name.removesuffix(".git")
    if name in {"", ".", ".."}:
        raise GitHubRepoError(422, "Repository name is invalid")

    return owner.lower(), name.lower()


async def resolve_repository(repo_url: str) -> ResolvedRepository:
    owner, name = parse_repo_url(repo_url)
    api_url = f"https://api.github.com/repos/{owner}/{name}"

    try:
        async with (
            asyncio.timeout(15),
            httpx.AsyncClient(
                timeout=5.0,
                follow_redirects=False,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "RepoAtlas",
                },
            ) as client,
        ):
            body = await read_response(client, "GET", api_url)
            metadata = RepositoryMetadata.model_validate_json(body)
            if metadata.private:
                raise GitHubRepoError(422, "Only public repositories are supported")

            owner, name = parse_repo_url(f"https://github.com/{metadata.full_name}")
            branch = quote(f"heads/{metadata.default_branch}", safe="")
            commit_url = f"https://api.github.com/repos/{owner}/{name}/commits/{branch}"
            commit_body = await read_response(
                client,
                "GET",
                commit_url,
                headers={"Accept": "application/vnd.github.sha"},
            )
            commit_sha = commit_body.decode("ascii").strip()
            if SHA_PATTERN.fullmatch(commit_sha) is None:
                raise GitHubRepoError(502, "GitHub returned an invalid commit SHA")

            return ResolvedRepository(owner=owner, name=name, commit_sha=commit_sha)

    except httpx.HTTPStatusError as error:
        status = error.response.status_code
        if status == 404:
            raise GitHubRepoError(404, "Public repository or branch was not found") from None
        if status in {409, 422}:
            raise GitHubRepoError(422, "Repository has no readable default-branch commit") from None
        if status in {403, 429}:
            raise GitHubRepoError(503, "GitHub request limit reached. Try again later.") from None
        if 300 <= status < 400:
            raise GitHubRepoError(422, "Repository moved. Submit its current GitHub URL.") from None
        raise GitHubRepoError(502, "GitHub could not return the repository") from None
    except httpx.RequestError, TimeoutError:
        raise GitHubRepoError(503, "GitHub is temporarily unavailable") from None
    except ValidationError, UnicodeDecodeError, GitHubOAuthError:
        raise GitHubRepoError(502, "GitHub returned an unreadable repository response") from None
