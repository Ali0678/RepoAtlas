import asyncio
from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.v1.auth import CurrentUser, get_current_user, require_trusted_origin
from app.schemas.analysis import AnalysisStatusResponse, CreateAnalysisRequest
from app.services.analyses import create_or_get_analysis, get_analysis
from app.services.github_repos import GitHubRepoError, resolve_repository

router = APIRouter(prefix="/api/v1/analyses", tags=["analyses"])


async def analysis_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with session_factory() as session:
        yield session


@router.post(
    "",
    status_code=202,
    responses={200: {"model": AnalysisStatusResponse}},
    dependencies=[Depends(require_trusted_origin)],
)
async def submit_analysis(
    body: CreateAnalysisRequest,
    request: Request,
    response: Response,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(analysis_session)],
) -> AnalysisStatusResponse:
    try:
        repository = await resolve_repository(body.repo_url)
    except GitHubRepoError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error

    analysis = await create_or_get_analysis(session, repository, user.id)
    if analysis.status == "queued":
        queue: ArqRedis = request.app.state.redis_client
        analysis_id = str(analysis.id)
        try:
            async with asyncio.timeout(5):
                await queue.enqueue_job("analyze_repository", analysis_id, _job_id=analysis_id)
        except (RedisError, TimeoutError) as error:
            raise HTTPException(
                status_code=503, detail="Analysis queue is unavailable. Try again."
            ) from error
    elif analysis.status in {"complete", "failed"}:
        response.status_code = 200

    return AnalysisStatusResponse.model_validate(analysis)


@router.get("/{analysis_id}", dependencies=[Depends(get_current_user)])
async def get_analysis_status(
    analysis_id: UUID,
    session: Annotated[AsyncSession, Depends(analysis_session)],
) -> AnalysisStatusResponse:
    analysis = await get_analysis(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AnalysisStatusResponse.model_validate(analysis)
