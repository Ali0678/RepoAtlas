import asyncio
import os
import signal
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from tempfile import TemporaryDirectory

from app.core.limits import CLONE_TIMEOUT_SECONDS, MAX_CLONE_BYTES
from app.services.github_repos import (
    SHA_PATTERN,
    GitHubRepoError,
    ResolvedRepository,
    parse_repo_url,
)

MAX_GIT_OUTPUT_BYTES = 16_384
GIT_ENVIRONMENT = {
    "PATH": os.defpath,
    "LC_ALL": "C",
    "GIT_ALLOW_PROTOCOL": "https",
    "GIT_CONFIG_GLOBAL": os.devnull,
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_TERMINAL_PROMPT": "0",
}

# Limit writes in the Git process tree without changing limits for the API or worker.
# Let Git report EFBIG as an ordinary write failure.
GIT_WITH_FILE_LIMIT = """
import os
import resource
import signal
import sys

limit = int(sys.argv[1])
resource.setrlimit(resource.RLIMIT_FSIZE, (limit, limit))
signal.signal(signal.SIGXFSZ, signal.SIG_IGN)
os.execvp("git", ["git", *sys.argv[2:]])
"""


class RepositoryCloneError(Exception):
    pass


@asynccontextmanager
async def open_git(
    directory: Path,
    *arguments: str,
    file_limit: int = MAX_CLONE_BYTES,
    merge_diagnostics: bool = False,
) -> AsyncIterator[tuple[asyncio.subprocess.Process, asyncio.StreamReader]]:
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-I",
        "-c",
        GIT_WITH_FILE_LIMIT,
        str(file_limit),
        "-c",
        f"core.hooksPath={os.devnull}",
        "-c",
        "http.followRedirects=false",
        # Keep received objects packed so the file limit applies to the transfer.
        "-c",
        "fetch.unpackLimit=1",
        *arguments,
        cwd=directory,
        env=GIT_ENVIRONMENT,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT if merge_diagnostics else asyncio.subprocess.DEVNULL,
        start_new_session=True,
    )
    assert process.stdout is not None
    stdout = process.stdout
    try:
        yield process, stdout
    finally:
        if process.returncode is None or not stdout.at_eof():
            # A Git HTTP helper can outlive its parent. Stop the entire process group.
            with suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGKILL)
            await process.communicate()


async def _run_git(
    directory: Path, file_limit: int, failure_message: str, *arguments: str
) -> bytes:
    async with open_git(directory, *arguments, file_limit=file_limit, merge_diagnostics=True) as (
        process,
        stdout,
    ):
        try:
            await stdout.readexactly(MAX_GIT_OUTPUT_BYTES + 1)
        except asyncio.IncompleteReadError as end:
            output = end.partial
        else:
            raise RepositoryCloneError("Git produced too much diagnostic output")

        if await process.wait() != 0:
            if b"File too large" in output:
                raise RepositoryCloneError("Repository exceeds the clone size limit")
            raise RepositoryCloneError(failure_message)
        return output


@asynccontextmanager
async def clone_repository(
    repo_url: str,
    commit_sha: str,
    *,
    max_clone_bytes: int = MAX_CLONE_BYTES,
    timeout_seconds: float = CLONE_TIMEOUT_SECONDS,
) -> AsyncIterator[Path]:
    try:
        owner, name = parse_repo_url(repo_url)
    except GitHubRepoError as error:
        raise RepositoryCloneError("Invalid GitHub repository URL") from error
    if SHA_PATTERN.fullmatch(commit_sha) is None:
        raise RepositoryCloneError("Invalid repository commit SHA")
    clone_url = f"{ResolvedRepository(owner, name, commit_sha).url}.git"

    with TemporaryDirectory(prefix="repoatlas-") as temporary_directory:
        directory = Path(temporary_directory)
        try:
            async with asyncio.timeout(timeout_seconds):
                await _run_git(
                    directory,
                    max_clone_bytes,
                    "Could not initialize the temporary Git repository",
                    "init",
                    "--quiet",
                    "--bare",
                    "--template=",
                    "--object-format=sha1",
                )
                await _run_git(
                    directory,
                    max_clone_bytes,
                    "Could not fetch the requested GitHub commit",
                    "fetch",
                    "--quiet",
                    "--depth=1",
                    "--no-tags",
                    "--no-recurse-submodules",
                    "--no-auto-maintenance",
                    "--",
                    clone_url,
                    commit_sha,
                )
                pack_directory = directory / "objects" / "pack"
                pack_size = sum(entry.stat().st_size for entry in pack_directory.iterdir())
                if pack_size > max_clone_bytes:
                    raise RepositoryCloneError("Repository exceeds the clone size limit")
                fetched_sha = await _run_git(
                    directory,
                    max_clone_bytes,
                    "Could not verify the fetched commit",
                    "rev-parse",
                    "--verify",
                    "FETCH_HEAD^{commit}",
                )
                if fetched_sha.strip() != commit_sha.encode("ascii"):
                    raise RepositoryCloneError("Git returned a different commit than requested")
        except TimeoutError:
            raise RepositoryCloneError("Repository fetch timed out") from None

        yield directory
