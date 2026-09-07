import aiosqlite
from app.core.paths import config_dir

_DB_PATH = config_dir() / "jobs.db"
_db: aiosqlite.Connection | None = None


async def init_db() -> None:
    global _db
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(str(_DB_PATH))
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("""
        CREATE TABLE IF NOT EXISTS download_jobs (
            id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            track_title TEXT,
            track_artist TEXT,
            track_meta TEXT NOT NULL,
            folder_path TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            error TEXT,
            progress REAL DEFAULT 0.0,
            position INTEGER DEFAULT 0,
            retry_count INTEGER DEFAULT 0
        )
    """)
    try:
        await _db.execute("ALTER TABLE download_jobs ADD COLUMN retry_count INTEGER DEFAULT 0")
    except Exception:
        pass
    await _db.commit()


async def close_db() -> None:
    global _db
    if _db:
        await _db.close()
        _db = None


def get_db() -> aiosqlite.Connection:
    assert _db is not None, "DB not initialized — call init_db() first"
    return _db
