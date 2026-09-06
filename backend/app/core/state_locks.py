import asyncio
from pathlib import Path

# Guards read-modify-write sequences on a source folder's .spotify.json so a
# refresh/delete request and an in-progress download can't race and clobber
# each other's write.
_locks: dict[str, asyncio.Lock] = {}


def get_state_lock(folder: Path) -> asyncio.Lock:
    key = str(Path(folder).resolve())
    lock = _locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _locks[key] = lock
    return lock
