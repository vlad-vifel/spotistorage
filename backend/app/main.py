import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse
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

    sync_task = asyncio.create_task(asyncio.to_thread(_sync_all_libraries, [lib.root_path for lib in cfg.libraries]))

    await download_queue.start()
    yield

    sync_task.cancel()
    await db_svc.close_db()


app = FastAPI(title="SpotiStorage", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:8000", "http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_API_TOKEN = os.environ.get("SPOTISTORAGE_API_TOKEN")


class _TokenAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if (
            request.url.path.startswith("/api/")
            and request.url.path != "/api/health"
            and request.headers.get("x-spotistorage-token") != _API_TOKEN
        ):
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
        return await call_next(request)


if _API_TOKEN:
    app.add_middleware(_TokenAuthMiddleware)

app.include_router(config.router)
app.include_router(libraries.router)
app.include_router(sources.router)
app.include_router(downloads.router)
app.include_router(dependencies.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


def _find_frontend_dist() -> Path | None:
    for candidate in (Path(__file__).parents[2] / "frontend" / "dist", Path(__file__).parent.parent):
        if (candidate / "index.html").is_file():
            return candidate
    return None


_FRONTEND_DIST = _find_frontend_dist()
if _FRONTEND_DIST is not None:
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = _FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")
