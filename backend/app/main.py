import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import config, libraries, sources, downloads, dependencies
from app.services.download_queue import download_queue
from app.services.config_store import load_config
from app.services.library_scan import scan_library
from app.services.state_store import sync_file_existence
from app.services.deps_check import check_dependencies
from app.services import db as db_svc


def _cleanup_temp_files(root: str) -> None:
    from pathlib import Path as _Path
    try:
        for f in _Path(root).rglob("_dl_*"):
            try:
                f.unlink()
            except OSError:
                pass
    except Exception:
        pass


def _sync_all_libraries(library_roots: list[str]) -> None:
    for root in library_roots:
        _cleanup_temp_files(root)
        try:
            results = scan_library(root)
        except Exception as exc:
            print(f"[BACKEND] WARNING: could not scan {root}: {exc}")
            continue
        for folder, state in results:
            try:
                sync_file_existence(folder, state)
            except Exception as exc:
                print(f"[BACKEND] WARNING: could not sync '{state.name}': {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_svc.init_db()

    cfg = load_config()
    deps = check_dependencies()
    if not deps["all_ok"]:
        missing = [k for k, v in deps.items() if k != "all_ok" and not v]
        print(f"[BACKEND] WARNING: missing dependencies: {', '.join(missing)}")

    _sync_all_libraries([lib.root_path for lib in cfg.libraries])

    await download_queue.start()
    yield

    await db_svc.close_db()


app = FastAPI(title="SpotiStorage", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router)
app.include_router(libraries.router)
app.include_router(sources.router)
app.include_router(downloads.router)
app.include_router(dependencies.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
