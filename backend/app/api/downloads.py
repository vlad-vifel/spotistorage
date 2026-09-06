import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.download_queue import download_queue
from app.services.library_scan import scan_library
from app.services.state_store import sync_file_existence
from app.services.refresh import refresh_source_state
from app.services.source_lookup import find_source
from app.services.download_orchestration import resolve_source_tracks, missing_track_ids
from app.api.sources import _active_library

router = APIRouter(prefix="/api", tags=["downloads"])

# Caps how many sources we refresh/resolve against Spotify at once, so a large
# library doesn't hammer Spotify with hundreds of simultaneous requests.
_NETWORK_CONCURRENCY = 4


def _active_root():
    return _active_library().root_path


@router.get("/downloads")
def list_downloads():
    return download_queue.list_jobs()


@router.post("/downloads/clear-failed")
async def clear_failed_downloads():
    count = await download_queue.clear_all_failed()
    return {"cleared": count}


@router.post("/downloads/{job_id}/retry")
async def retry_download(job_id: str):
    job = await download_queue.enqueue_retry(job_id)
    if not job:
        raise HTTPException(404, "Job not found or not failed")
    return job


class RetryWithUrlRequest(BaseModel):
    url: str


@router.post("/downloads/{job_id}/retry-with-url")
async def retry_download_with_url(job_id: str, body: RetryWithUrlRequest):
    url = body.url.strip()
    if not url:
        raise HTTPException(400, "URL is required")
    job = await download_queue.enqueue_manual_url_retry(job_id, url)
    if not job:
        raise HTTPException(404, "Job not found or not failed")
    return job


@router.delete("/downloads/{job_id}")
async def remove_download(job_id: str):
    removed = await download_queue.remove_job(job_id)
    if not removed:
        raise HTTPException(404, "Job not found")
    return {"ok": True}


@router.delete("/downloads")
async def cancel_all_downloads():
    count = await download_queue.cancel_all_active()
    return {"cancelled": count}


@router.post("/sources/refresh-all")
async def refresh_all_sources():
    root = _active_root()
    results = scan_library(root)
    sem = asyncio.Semaphore(_NETWORK_CONCURRENCY)
    error_details: list[str] = []

    async def _refresh_one(folder, state) -> dict | None:
        async with sem:
            try:
                _, result = await refresh_source_state(folder, state)
                return result
            except Exception as exc:
                print(f"[BACKEND] refresh failed for {state.name!r}: {exc}", flush=True)
                error_details.append(f"{state.name}: {exc}")
                return None

    outcomes = await asyncio.gather(*[_refresh_one(folder, state) for folder, state in results])

    total_new = sum(r.get("new", 0) for r in outcomes if r)
    total_removed = sum(r.get("removed_from_source", 0) for r in outcomes if r)
    errors = sum(1 for r in outcomes if r is None)
    return {
        "refreshed": len(results) - errors,
        "new": total_new,
        "removed_from_source": total_removed,
        "errors": errors,
        "error_details": error_details,
    }


@router.post("/sources/download-all", status_code=202)
async def download_all_missing():
    await download_queue.clear_done_if_idle()
    root = _active_root()
    results = scan_library(root)
    sem = asyncio.Semaphore(_NETWORK_CONCURRENCY)
    error_details: list[str] = []

    async def _prepare_one(folder, state) -> tuple | None:
        state = sync_file_existence(folder, state)
        source_id = state.spotify_id
        in_progress = download_queue.get_in_progress_track_ids(source_id)
        missing_ids = missing_track_ids(state, in_progress)
        if not missing_ids:
            return None
        async with sem:
            try:
                resolved_by_id = await resolve_source_tracks(source_id, state.spotify_url)
            except Exception as exc:
                print(f"[BACKEND] resolve failed for {state.name!r}: {exc}", flush=True)
                error_details.append(f"{state.name}: {exc}")
                return None
        tracks_to_dl = [resolved_by_id[tid] for tid in missing_ids if tid in resolved_by_id]
        return source_id, folder, tracks_to_dl

    prepared = await asyncio.gather(*[_prepare_one(folder, state) for folder, state in results])

    total_queued = 0
    for entry in prepared:
        if not entry:
            continue
        source_id, folder, tracks_to_dl = entry
        jobs = await download_queue.enqueue_source(source_id, folder, tracks_to_dl)
        total_queued += len(jobs)
    return {"queued": total_queued, "error_details": error_details}


@router.post("/sources/{source_id}/tracks/{track_id}/download", status_code=202)
async def download_single_track(source_id: str, track_id: str):
    root = _active_root()
    found = find_source(root, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    track_state = state.tracks.get(track_id)
    if not track_state:
        raise HTTPException(404, "Track not found in source")

    try:
        resolved_by_id = await resolve_source_tracks(source_id, state.spotify_url)
    except Exception as exc:
        raise HTTPException(400, str(exc))

    if track_id not in resolved_by_id:
        raise HTTPException(404, "Track not found on Spotify")
    jobs = await download_queue.enqueue_source(source_id, folder, [resolved_by_id[track_id]])
    return {"queued": len(jobs)}


@router.post("/sources/{source_id}/download", status_code=202)
async def start_download(source_id: str):
    await download_queue.clear_done_if_idle()

    root = _active_root()
    found = find_source(root, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    in_progress = download_queue.get_in_progress_track_ids(source_id)
    missing_ids = missing_track_ids(state, in_progress)
    if not missing_ids:
        return {"queued": 0}

    try:
        resolved_by_id = await resolve_source_tracks(source_id, state.spotify_url)
    except Exception as exc:
        raise HTTPException(400, str(exc))

    tracks_to_dl = [resolved_by_id[tid] for tid in missing_ids if tid in resolved_by_id]

    jobs = await download_queue.enqueue_source(source_id, folder, tracks_to_dl)
    return {"queued": len(jobs)}


@router.post("/sources/{source_id}/refresh")
async def refresh_source(source_id: str):
    root = _active_root()
    found = find_source(root, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    try:
        _, result = await refresh_source_state(folder, state)
    except Exception as exc:
        raise HTTPException(400, str(exc))
    return result
