from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Analysis, Repo
from app.services.github_repos import ResolvedRepository


async def create_or_get_analysis(
    session: AsyncSession,
    repository: ResolvedRepository,
    user_id: UUID,
) -> Analysis:
    async with session.begin():
        repo_statement = (
            insert(Repo)
            .values(
                owner=repository.owner,
                name=repository.name,
                url=repository.url,
            )
            .on_conflict_do_update(
                constraint="uq_repos_owner_name",
                set_={"url": repository.url},
            )
            .returning(Repo.id)
        )
        repo_result = await session.execute(repo_statement)
        repo_id = repo_result.scalar_one()

        analysis_statement = (
            insert(Analysis)
            .values(
                repo_id=repo_id,
                commit_sha=repository.commit_sha,
                created_by=user_id,
            )
            .on_conflict_do_nothing(constraint="uq_analyses_repo_commit")
        )
        await session.execute(analysis_statement)

        analysis_result = await session.execute(
            select(Analysis).where(
                Analysis.repo_id == repo_id,
                Analysis.commit_sha == repository.commit_sha,
            )
        )
        analysis = analysis_result.scalar_one()

    return analysis


async def get_analysis(
    session: AsyncSession,
    analysis_id: UUID,
) -> Analysis | None:
    return await session.get(Analysis, analysis_id)
