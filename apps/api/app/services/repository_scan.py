import asyncio
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from app.core.limits import ANALYSIS_TIMEOUT_SECONDS, MAX_SOURCE_FILE_BYTES, MAX_SOURCE_FILES
from app.services.repository_clone import open_git

LANGUAGE_BY_EXTENSION = {
    ".py": "python",
    ".pyi": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
}
REGULAR_FILE_MODES = {b"100644", b"100755"}


class RepositoryScanError(Exception):
    pass


@dataclass(frozen=True)
class ScannedFile:
    path: str
    language: str
    size_bytes: int


def _parse_tree_entry(entry: bytes, max_file_bytes: int) -> ScannedFile | None:
    header, separator, path_bytes = entry.partition(b"\t")
    fields = header.split()
    if not separator or len(fields) != 4:
        raise RepositoryScanError("Git returned an invalid tree entry")

    mode, object_type, _, size = fields
    if mode not in REGULAR_FILE_MODES or object_type != b"blob":
        return None

    if any(part in {b"", b".", b".."} for part in path_bytes.split(b"/")):
        raise RepositoryScanError("Git returned an invalid file path")
    try:
        path = path_bytes.decode("utf-8")
    except UnicodeDecodeError:
        # Skip paths that cannot be stored losslessly as PostgreSQL text.
        return None

    language = LANGUAGE_BY_EXTENSION.get(PurePosixPath(path).suffix.lower())
    if language is None:
        return None
    if not size.isdigit():
        raise RepositoryScanError("Git could not determine a source file's size")
    size_bytes = int(size)
    if size_bytes > max_file_bytes:
        return None
    return ScannedFile(path=path, language=language, size_bytes=size_bytes)


async def scan_repository(
    directory: Path,
    *,
    max_files: int = MAX_SOURCE_FILES,
    max_file_bytes: int = MAX_SOURCE_FILE_BYTES,
) -> list[ScannedFile]:
    files: list[ScannedFile] = []
    try:
        async with (
            asyncio.timeout(ANALYSIS_TIMEOUT_SECONDS),
            # FETCH_HEAD was verified by clone_repository before handing over the directory.
            open_git(directory, "ls-tree", "-rlz", "--full-tree", "FETCH_HEAD") as (
                process,
                stdout,
            ),
        ):
            while True:
                try:
                    entry = await stdout.readuntil(b"\0")
                except asyncio.IncompleteReadError as end:
                    if end.partial:
                        raise RepositoryScanError("Git returned an incomplete tree entry") from end
                    break
                except asyncio.LimitOverrunError as error:
                    raise RepositoryScanError("Git returned an oversized tree entry") from error

                file = _parse_tree_entry(entry[:-1], max_file_bytes)
                if file is None:
                    continue
                if len(files) >= max_files:
                    raise RepositoryScanError(
                        f"Repository contains more than {max_files} source files"
                    )
                files.append(file)

            if await process.wait() != 0:
                raise RepositoryScanError("Could not read the fetched Git tree")
    except TimeoutError:
        raise RepositoryScanError("Repository scan timed out") from None
    return files
