import asyncio
import logging
import signal
from typing import cast
from uuid import UUID

from arq.worker import Retry, Worker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.connections import connected_services
from app.core.limits import ANALYSIS_TIMEOUT_SECONDS
from app.services.ingestion import RepositoryIngestionError, fail_ingestion, ingest_repository

logger = logging.getLogger(__name__)
MAX_JOB_TRIES = 5


async def analyze_repository(ctx: dict[str, object], analysis_id: str) -> None:
    sessions = cast(async_sessionmaker[AsyncSession], ctx["session_factory"])
    identifier = UUID(analysis_id)
    try:
        await ingest_repository(sessions, identifier)
    except SQLAlchemyError:
        if cast(int, ctx["job_try"]) < MAX_JOB_TRIES:
            raise Retry(defer=5) from None

        message = "Could not store the repository analysis"
        try:
            await fail_ingestion(sessions, identifier, message)
        except SQLAlchemyError:
            logger.error("Could not record the failure for analysis %s", identifier)
        raise RepositoryIngestionError(message) from None


async def main() -> None:
    settings = Settings()
    stop_requested = asyncio.Event()
    loop = asyncio.get_running_loop()
    shutdown_signals = (signal.SIGINT, signal.SIGTERM)

    async with connected_services(settings) as (engine, redis_client):
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        worker = Worker(
            functions=[analyze_repository],
            redis_pool=redis_client,
            ctx={"session_factory": session_factory},
            max_jobs=2,
            max_tries=MAX_JOB_TRIES,
            # Allow the job to record a failure and clean up after its own deadline.
            job_timeout=ANALYSIS_TIMEOUT_SECONDS + 15,
        )

        def mark_stopping(_signum: signal.Signals) -> None:
            stop_requested.set()

        worker.on_stop = mark_stopping

        try:
            await worker.async_run()
        except asyncio.CancelledError:
            if not stop_requested.is_set():
                raise
        finally:
            for shutdown_signal in shutdown_signals:
                loop.remove_signal_handler(shutdown_signal)
            if not stop_requested.is_set():
                worker.handle_sig(signal.SIGTERM)
            await worker.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )
    asyncio.run(main())
