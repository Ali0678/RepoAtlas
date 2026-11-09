import asyncio
import logging
import signal

from app.core.config import Settings
from app.core.connections import connected_services

logger = logging.getLogger(__name__)


async def main() -> None:
    settings = Settings()
    stop_requested = asyncio.Event()
    loop = asyncio.get_running_loop()
    shutdown_signals = (signal.SIGINT, signal.SIGTERM)

    for shutdown_signal in shutdown_signals:
        loop.add_signal_handler(shutdown_signal, stop_requested.set)

    try:
        async with connected_services(settings):
            logger.info("Worker placeholder ready; no jobs are processed yet")
            await stop_requested.wait()
            logger.info("Worker shutdown requested")
    finally:
        for shutdown_signal in shutdown_signals:
            loop.remove_signal_handler(shutdown_signal)

    logger.info("Worker stopped")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )
    asyncio.run(main())
