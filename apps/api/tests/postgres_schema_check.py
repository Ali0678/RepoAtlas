import asyncio

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.db.base import Base
from app.db.models import Analysis, Edge, File, Repo, Symbol, User
from app.db.session import create_database_engine


async def expect_violation(session: AsyncSession, row: Base, sqlstate: str) -> None:
    try:
        async with session.begin_nested():
            session.add(row)
            await session.flush()
    except IntegrityError as error:
        assert getattr(error.orig, "sqlstate", None) == sqlstate
    else:
        raise AssertionError(f"Expected PostgreSQL error {sqlstate}")


async def main() -> None:
    engine = create_database_engine(str(Settings().database_url))
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            database = await session.scalar(text("SELECT current_database()"))
            if not isinstance(database, str) or not database.startswith("repoatlas_migration_"):
                raise RuntimeError("Run this check against the disposable migration database")

            user = User(github_id=123, login="schema-check")
            repo = Repo(
                owner="schema-check", name="demo", url="https://github.com/schema-check/demo"
            )
            session.add_all([user, repo])
            await session.flush()

            first = Analysis(repo_id=repo.id, commit_sha="a" * 40, created_by=user.id)
            second = Analysis(repo_id=repo.id, commit_sha="b" * 40, created_by=user.id)
            session.add_all([first, second])
            await session.flush()
            assert first.status == "queued"
            assert first.stats == {}

            source = File(analysis_id=first.id, path="main.py", language="python", size_bytes=10)
            target = File(analysis_id=first.id, path="util.py", language="python", size_bytes=10)
            other = File(analysis_id=second.id, path="util.py", language="python", size_bytes=10)
            session.add_all([source, target, other])
            await session.flush()

            symbol = Symbol(
                file_id=source.id, name="main", kind="function", start_line=1, end_line=2
            )
            edge = Edge(analysis_id=first.id, source_file_id=source.id, target_file_id=target.id)
            session.add_all([symbol, edge])
            await session.flush()
            assert edge.kind == "import"
            assert edge.weight == 1

            await expect_violation(
                session, Analysis(repo_id=repo.id, commit_sha=first.commit_sha), "23505"
            )
            await expect_violation(
                session,
                File(analysis_id=first.id, path=source.path, language="python", size_bytes=10),
                "23505",
            )
            await expect_violation(
                session,
                Edge(analysis_id=first.id, source_file_id=source.id, target_file_id=other.id),
                "23503",
            )
            await session.rollback()
    finally:
        await engine.dispose()

    print("PostgreSQL model checks passed")


if __name__ == "__main__":
    asyncio.run(main())
