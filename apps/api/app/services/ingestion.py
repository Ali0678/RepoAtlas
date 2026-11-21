import asyncio
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.limits import ANALYSIS_TIMEOUT_SECONDS
from app.db.models import Analysis, File, Repo
from app.services.repository_clone import RepositoryCloneError, clone_repository
from app.services.repository_scan import RepositoryScanError, scan_repository


class RepositoryIngestionError(Exception):
    pass


async def _lock_unscanned_analysis(session: AsyncSession, analysis_id: UUID) -> Analysis | None:
    return await session.scalar(
        select(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status.in_(("queued", "running")),
            Analysis.stage.in_(("queued", "cloning", "scanning")),
        )
        .with_for_update()
    )


async def fail_ingestion(
    sessions: async_sessionmaker[AsyncSession], analysis_id: UUID, message: str
) -> None:
    async with sessions.begin() as session:
        analysis = await _lock_unscanned_analysis(session, analysis_id)
        if analysis is not None:
            analysis.status = "failed"
            analysis.stage = "failed"
            analysis.error = message
            analysis.completed_at = datetime.now(UTC)


async def _scan_and_save(sessions: async_sessionmaker[AsyncSession], analysis_id: UUID) -> None:
    async with sessions.begin() as session:
        analysis = await _lock_unscanned_analysis(session, analysis_id)
        if analysis is None:
            return
        repo = await session.get(Repo, analysis.repo_id)
        if repo is None:
            raise RepositoryIngestionError("Analysis repository was not found")
        repo_url, commit_sha = repo.url, analysis.commit_sha
        analysis.status = "running"
        analysis.stage = "cloning"
        analysis.error = None

    # Commit stage changes before Git I/O so we don't hold database locks during the fetch.
    async with clone_repository(repo_url, commit_sha) as directory:
        async with sessions.begin() as session:
            analysis = await _lock_unscanned_analysis(session, analysis_id)
            if analysis is None:
                return
            analysis.stage = "scanning"
        files = await scan_repository(directory)

    async with sessions.begin() as session:
        analysis = await _lock_unscanned_analysis(session, analysis_id)
        if analysis is None:
            return
        await session.execute(delete(File).where(File.analysis_id == analysis_id))
        if files:
            await session.execute(
                insert(File),
                [
                    {
                        "analysis_id": analysis_id,
                        "path": file.path,
                        "language": file.language,
                        "size_bytes": file.size_bytes,
                    }
                    for file in files
                ],
            )
        # The inventory and its checkpoint must commit together.
        analysis.stats = {**analysis.stats, "total_files": len(files)}
        analysis.stage = "scanned"


async def ingest_repository(sessions: async_sessionmaker[AsyncSession], analysis_id: UUID) -> None:
    try:
        async with asyncio.timeout(ANALYSIS_TIMEOUT_SECONDS):
            await _scan_and_save(sessions, analysis_id)
    except (RepositoryCloneError, RepositoryScanError, RepositoryIngestionError) as error:
        message = str(error)
    except TimeoutError:
        message = "Repository analysis timed out"
    except OSError:
        message = "Could not access temporary repository storage"
    else:
        return

    await fail_ingestion(sessions, analysis_id, message)
    raise RepositoryIngestionError(message)
