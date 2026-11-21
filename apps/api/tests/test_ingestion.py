import asyncio
import os
import subprocess
from dataclasses import dataclass
from functools import partial
from pathlib import Path
from random import Random
from tempfile import TemporaryDirectory
from uuid import uuid4

import pytest
from arq.connections import ArqRedis
from arq.worker import Worker
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.limits import MAX_SOURCE_FILE_BYTES
from app.db.models import Analysis, File, Repo
from app.db.session import create_database_engine
from app.services import repository_clone
from app.services.repository_clone import RepositoryCloneError, clone_repository
from app.services.repository_scan import RepositoryScanError, ScannedFile, scan_repository
from app.workers.main import analyze_repository

EXPECTED_FILES = {
    ScannedFile("src/main.py", "python", 8),
    ScannedFile("src/view\tλ\n.TSX", "typescript", 1),
    ScannedFile("script.mjs", "javascript", 0),
}


@dataclass(frozen=True)
class LocalSnapshot:
    owner: str
    url: str
    pinned_sha: str
    latest_sha: str
    work_directory: Path


def git(directory: Path, *arguments: str) -> str:
    return subprocess.check_output(
        ["git", "-c", f"core.hooksPath={os.devnull}", *arguments],
        cwd=directory,
        env=repository_clone.GIT_ENVIRONMENT,
        text=True,
        timeout=10,
    ).strip()


@pytest.fixture
def snapshot(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> LocalSnapshot:
    source = tmp_path / "source"
    source.mkdir()
    git(source, "init", "--quiet", "--template=", "--object-format=sha1")
    git(source, "config", "user.name", "RepoAtlas test")
    git(source, "config", "user.email", "test@example.com")
    git(source, "commit", "--allow-empty", "--quiet", "-m", "Base fixture")
    root_sha = git(source, "rev-parse", "HEAD")

    (source / "src").mkdir()
    (source / "src/main.py").write_bytes(b"print(1)")
    (source / "src/view\tλ\n.TSX").write_bytes(b"x")
    (source / "script.mjs").touch(mode=0o755)
    (source / "README.md").write_text("Ignored extension")
    (source / "oversized.py").write_bytes(b"x" * (MAX_SOURCE_FILE_BYTES + 1))
    (source / "link.py").symlink_to("src/main.py")
    git(source, "add", ".")
    git(source, "update-index", "--add", "--cacheinfo", f"160000,{root_sha},module.ts")
    git(source, "commit", "--quiet", "-m", "Pinned fixture")
    pinned_sha = git(source, "rev-parse", "HEAD")

    (source / "later.py").write_bytes(Random(0).randbytes(128_000))
    git(source, "add", "later.py")
    git(source, "commit", "--quiet", "-m", "Move branch tip")
    latest_sha = git(source, "rev-parse", "HEAD")

    owner = f"test-{uuid4().hex}"
    url = f"https://github.com/{owner}/fixture"
    work_directory = tmp_path / "clones"
    work_directory.mkdir()
    monkeypatch.setattr(
        repository_clone, "TemporaryDirectory", partial(TemporaryDirectory, dir=work_directory)
    )
    # Route this one repository to a local Git transport for repeatable offline tests.
    for key, value in {
        "GIT_ALLOW_PROTOCOL": "file",
        "GIT_CONFIG_COUNT": "1",
        "GIT_CONFIG_KEY_0": f"url.{source.as_uri()}.insteadOf",
        "GIT_CONFIG_VALUE_0": f"{url}.git",
    }.items():
        monkeypatch.setitem(repository_clone.GIT_ENVIRONMENT, key, value)
    return LocalSnapshot(owner, url, pinned_sha, latest_sha, work_directory)


async def test_fetch_and_scan_pinned_snapshot(snapshot: LocalSnapshot) -> None:
    async with clone_repository(snapshot.url, snapshot.pinned_sha) as directory:
        assert git(directory, "rev-parse", "FETCH_HEAD") == snapshot.pinned_sha
        assert git(directory, "rev-parse", "--is-shallow-repository") == "true"
        assert git(directory, "rev-parse", "--is-bare-repository") == "true"
        assert set(await scan_repository(directory, max_files=3)) == EXPECTED_FILES

        with pytest.raises(RepositoryScanError, match="more than 2 source files"):
            await scan_repository(directory, max_files=2)

    assert not list(snapshot.work_directory.iterdir())


async def test_cleanup_after_scan_failure(snapshot: LocalSnapshot) -> None:
    with pytest.raises(RepositoryScanError, match="more than 2 source files"):
        async with clone_repository(snapshot.url, snapshot.pinned_sha) as directory:
            await scan_repository(directory, max_files=2)
    assert not list(snapshot.work_directory.iterdir())


async def test_cleanup_after_clone_size_limit(snapshot: LocalSnapshot) -> None:
    with pytest.raises(RepositoryCloneError, match="exceeds the clone size limit"):
        async with clone_repository(snapshot.url, snapshot.latest_sha, max_clone_bytes=8_192):
            pytest.fail("The repository exceeded the clone size limit")
    assert not list(snapshot.work_directory.iterdir())


async def test_cleanup_after_clone_timeout(
    snapshot: LocalSnapshot, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    executable = tmp_path / "git"
    executable.write_text("#!/bin/sh\nexec /bin/sleep 60\n")
    executable.chmod(0o700)
    monkeypatch.setitem(repository_clone.GIT_ENVIRONMENT, "PATH", str(tmp_path))

    async with asyncio.timeout(5):
        with pytest.raises(RepositoryCloneError, match="Repository fetch timed out"):
            async with clone_repository(snapshot.url, snapshot.pinned_sha, timeout_seconds=0.1):
                pytest.fail("The repository fetch exceeded its timeout")
    assert not list(snapshot.work_directory.iterdir())


async def test_arq_saves_inventory_and_handles_retries(snapshot: LocalSnapshot) -> None:
    database_url = os.environ.get("REPOATLAS_TEST_DATABASE_URL")
    redis_url = os.environ.get("REPOATLAS_TEST_REDIS_URL")
    if not database_url or not redis_url:
        pytest.skip("Set the RepoAtlas test database and Redis URLs to run this integration test")

    engine = create_database_engine(database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    queue = ArqRedis.from_url(redis_url, socket_connect_timeout=5, socket_timeout=5)
    queue_name = f"repoatlas:test:{uuid4().hex}"
    repo = Repo(id=uuid4(), owner=snapshot.owner, name="fixture", url=snapshot.url)
    try:
        async with sessions.begin() as session:
            session.add(repo)
            await session.flush()
            resumed = Analysis(
                repo_id=repo.id, commit_sha=snapshot.pinned_sha, status="running", stage="scanning"
            )
            missing = Analysis(repo_id=repo.id, commit_sha="0" * 40)
            session.add_all([resumed, missing])
            await session.flush()
            session.add(
                File(analysis_id=resumed.id, path="stale.py", language="python", size_bytes=1)
            )

        consumer = Worker(
            functions=[analyze_repository],
            redis_pool=queue,
            queue_name=queue_name,
            burst=True,
            handle_signals=False,
            keep_result=0,
            ctx={"session_factory": sessions},
        )
        try:
            for analysis in (resumed, missing):
                job_id = str(analysis.id)
                job = await queue.enqueue_job(
                    "analyze_repository", job_id, _queue_name=queue_name, _job_id=job_id
                )
                assert job is not None
            async with asyncio.timeout(15):
                await consumer.async_run()
        finally:
            await consumer.close()

        assert (consumer.jobs_complete, consumer.jobs_failed) == (1, 1)
        async with sessions() as session:
            scanned = await session.get(Analysis, resumed.id)
            failed = await session.get(Analysis, missing.id)
            assert scanned is not None
            assert (scanned.status, scanned.stage, scanned.stats) == (
                "running",
                "scanned",
                {"total_files": len(EXPECTED_FILES)},
            )
            assert failed is not None
            assert failed.status == failed.stage == "failed"
            assert failed.error == "Could not fetch the requested GitHub commit"
            assert failed.completed_at is not None
            files = list(await session.scalars(select(File).where(File.analysis_id == resumed.id)))
            assert {ScannedFile(file.path, file.language, file.size_bytes) for file in files} == (
                EXPECTED_FILES
            )

        await analyze_repository({"session_factory": sessions, "job_try": 2}, str(resumed.id))
        async with sessions() as session:
            ids = await session.scalars(select(File.id).where(File.analysis_id == resumed.id))
            assert set(ids) == {file.id for file in files}
        assert not list(snapshot.work_directory.iterdir())
    finally:
        try:
            async with sessions.begin() as session:
                await session.execute(delete(Repo).where(Repo.id == repo.id))
        finally:
            try:
                await queue.aclose()
            finally:
                await engine.dispose()
