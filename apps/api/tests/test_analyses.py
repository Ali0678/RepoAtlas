import asyncio
import os
from functools import partial
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from redis.exceptions import ConnectionError
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.v1 import analyses as routes
from app.api.v1.auth import CurrentUser, get_current_user
from app.db.models import Analysis, Repo, User
from app.db.session import create_database_engine
from app.services import github_repos
from app.services.analyses import create_or_get_analysis
from app.services.github_repos import GitHubRepoError, ResolvedRepository

ANALYSES_PATH = "/api/v1/analyses"
PUBLIC_URL = "https://github.com/pallets/flask"
API_ORIGIN = "http://localhost:8000"
TRUSTED_ORIGIN = {"Origin": API_ORIGIN}
COMMIT_SHA = "a" * 40


@pytest.mark.parametrize(
    "repo_url",
    [
        "http://github.com/pallets/flask",
        "https://localhost/pallets/flask",
        "https://example.org/pallets/flask",
        "https://github.com/pallets/flask/tree/main",
        "https://github.com/pallets/flask?tab=readme",
    ],
)
async def test_invalid_url_is_rejected_before_github_call(
    monkeypatch: pytest.MonkeyPatch, repo_url: str
) -> None:
    read_response = AsyncMock()
    monkeypatch.setattr(github_repos, "read_response", read_response)

    with pytest.raises(GitHubRepoError) as error:
        await github_repos.resolve_repository(repo_url)

    assert error.value.status_code == 422
    read_response.assert_not_awaited()


async def test_default_branch_resolution_uses_github_api(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def github(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 1:
            return httpx.Response(
                200,
                json={"full_name": "Pallets/Flask", "private": False, "default_branch": "dev/main"},
            )
        return httpx.Response(200, text=COMMIT_SHA)

    client_factory = partial(httpx.AsyncClient, transport=httpx.MockTransport(github))
    monkeypatch.setattr(httpx, "AsyncClient", client_factory)

    repository = await github_repos.resolve_repository("https://github.com/Pallets/Flask.git/")

    assert repository == ResolvedRepository("pallets", "flask", COMMIT_SHA)
    assert [request.url.host for request in requests] == ["api.github.com", "api.github.com"]
    assert requests[0].url.path == "/repos/pallets/flask"
    assert requests[1].url.raw_path == b"/repos/pallets/flask/commits/heads%2Fdev%2Fmain"
    assert requests[1].headers["Accept"] == "application/vnd.github.sha"


def browser(application: FastAPI) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=application),
        base_url=API_ORIGIN,
    )


async def test_submit_requires_origin_and_session(application: FastAPI) -> None:
    async with browser(application) as client:
        denied_origin = await client.post(ANALYSES_PATH, json={"repo_url": PUBLIC_URL})
        signed_out = await client.post(
            ANALYSES_PATH, json={"repo_url": PUBLIC_URL}, headers=TRUSTED_ORIGIN
        )

    assert denied_origin.status_code == 403
    assert signed_out.status_code == 401


@pytest.fixture
def queued_analysis(application: FastAPI, monkeypatch: pytest.MonkeyPatch) -> Analysis:
    user = CurrentUser(id=uuid4(), github_id=1, login="example", avatar_url=None)
    analysis = Analysis(
        id=uuid4(), repo_id=uuid4(), commit_sha=COMMIT_SHA, status="queued", stage="queued"
    )
    application.dependency_overrides[get_current_user] = lambda: user
    application.dependency_overrides[routes.analysis_session] = object
    application.state.redis_client = AsyncMock()
    monkeypatch.setattr(
        routes,
        "resolve_repository",
        AsyncMock(return_value=ResolvedRepository("pallets", "flask", COMMIT_SHA)),
    )
    monkeypatch.setattr(routes, "create_or_get_analysis", AsyncMock(return_value=analysis))
    monkeypatch.setattr(routes, "get_analysis", AsyncMock(return_value=analysis))
    return analysis


async def test_queue_failure_can_retry_with_same_job_id(
    application: FastAPI, queued_analysis: Analysis
) -> None:
    enqueue = application.state.redis_client.enqueue_job
    enqueue.side_effect = [ConnectionError(), None]
    async with browser(application) as client:
        failed, retried = [
            await client.post(ANALYSES_PATH, json={"repo_url": PUBLIC_URL}, headers=TRUSTED_ORIGIN)
            for _ in range(2)
        ]
        status = await client.get(f"{ANALYSES_PATH}/{queued_analysis.id}")

    assert failed.status_code == 503
    assert retried.status_code == 202
    assert retried.json()["analysis_id"] == str(queued_analysis.id)
    assert status.status_code == 200
    assert status.json() == retried.json()
    job_id = str(queued_analysis.id)
    assert enqueue.await_count == 2
    for call in enqueue.await_args_list:
        assert call.args == ("analyze_repository", job_id)
        assert call.kwargs == {"_job_id": job_id}


async def test_complete_analysis_is_reused_without_enqueueing(
    application: FastAPI, queued_analysis: Analysis
) -> None:
    queued_analysis.status = "complete"
    queued_analysis.stage = "complete"
    async with browser(application) as client:
        result = await client.post(
            ANALYSES_PATH, json={"repo_url": PUBLIC_URL}, headers=TRUSTED_ORIGIN
        )

    assert result.status_code == 200
    assert result.json()["status"] == "complete"
    application.state.redis_client.enqueue_job.assert_not_awaited()


async def test_postgres_reuses_concurrent_submissions() -> None:
    database_url = os.environ.get("REPOATLAS_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Set REPOATLAS_TEST_DATABASE_URL to a migrated test database")

    engine = create_database_engine(database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    identifier = uuid4()
    owner = f"test-{identifier.hex}"
    user = User(id=identifier, github_id=identifier.int >> 65, login=owner)
    try:
        async with sessions.begin() as session:
            session.add(user)
        repository = ResolvedRepository(owner, "demo", COMMIT_SHA)
        async with (
            sessions() as first_session,
            sessions() as second_session,
            asyncio.TaskGroup() as tasks,
        ):
            first_task = tasks.create_task(
                create_or_get_analysis(first_session, repository, user.id)
            )
            second_task = tasks.create_task(
                create_or_get_analysis(second_session, repository, user.id)
            )
        first, second = first_task.result(), second_task.result()
        assert first.id == second.id
        assert first.status == second.status == "queued"
        async with sessions() as session:
            newer = await create_or_get_analysis(
                session, ResolvedRepository(owner, "demo", "b" * 40), user.id
            )
        assert newer.id != first.id
        assert newer.repo_id == first.repo_id
    finally:
        try:
            async with sessions.begin() as session:
                await session.execute(delete(Repo).where(Repo.owner == owner, Repo.name == "demo"))
                await session.execute(delete(User).where(User.id == user.id))
        finally:
            await engine.dispose()
