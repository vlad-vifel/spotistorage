from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from app.core.paths import playlists_dir, albums_dir, tracks_dir
from app.core.state_locks import get_state_lock
from app.services.config_store import load_config
from app.services import audio_engine
from app.services.state_store import load_state, save_state, sync_file_existence
from app.services.library_scan import scan_library
from app.services.source_lookup import find_source
from app.services.filenames import source_folder
from app.services.download_queue import download_queue
from app.models.source import SpotifyJson, SourceType, TrackState, TrackStatus

router = APIRouter(prefix="/api/sources", tags=["sources"])


def _active_library():
    config = load_config()
    if not config.active_library_id or not config.libraries:
        raise HTTPException(400, "No library configured")
    libs = [l for l in config.libraries if l.id == config.active_library_id]
    if not libs:
        raise HTTPException(400, "Active library not found")
    return libs[0]


def _source_folder_path(library_root: str, source_type: str, name: str, artist: str = "") -> Path:
    if source_type == "playlist":
        return playlists_dir(library_root) / source_folder(source_type, name, artist)
    if source_type == "album":
        return albums_dir(library_root) / source_folder(source_type, name, artist)
    return tracks_dir(library_root)


def _state_to_meta(folder: Path, state: SpotifyJson, active_jobs: dict[str, str] | None = None) -> dict:
    active_jobs = active_jobs or {}

    def effective_status(tid: str, t) -> str:
        if tid in active_jobs:
            job_status = active_jobs[tid]
            return "downloaded" if job_status == "done" else job_status
        return t.status.value

    downloaded = sum(
        1 for tid, t in state.tracks.items()
        if effective_status(tid, t) == "downloaded"
    )
    active_track_count = sum(
        1 for t in state.tracks.values()
        if t.status != TrackStatus.removed_from_source
    )
    tracks = sorted(
        [
            {
                "id": tid,
                "file": t.file,
                "status": effective_status(tid, t),
                "title": t.title,
                "artist": t.artist,
                "position": t.position,
                "source": t.source,
                "bitrate_kbps": t.bitrate_kbps,
            }
            for tid, t in state.tracks.items()
        ],
        key=lambda x: (x["position"] or 9999),
    )
    return {
        "id": state.spotify_id,
        "type": state.type,
        "spotify_id": state.spotify_id,
        "spotify_url": state.spotify_url,
        "name": state.name,
        "artwork_url": state.artwork_url,
        "last_refreshed": state.last_refreshed,
        "total_tracks": active_track_count,
        "downloaded_tracks": downloaded,
        "folder_path": str(folder),
        "tracks": tracks,
    }


class ResolveRequest(BaseModel):
    url: str


@router.post("/resolve")
async def resolve_url(body: ResolveRequest):
    try:
        if "/user/" in body.url:
            cfg = load_config()
            return await audio_engine.resolve_user(body.url, sp_dc=cfg.sp_dc)
        data = await audio_engine.resolve_url(body.url)
    except Exception as exc:
        print(f"[BACKEND] resolve failed for {body.url!r}: {exc}", flush=True)
        raise HTTPException(400, str(exc))

    lib = _active_library()
    artist = ""
    if data["type"] == "album" and data.get("tracks"):
        artist = data["tracks"][0].get("album_artist", "")
    folder = _source_folder_path(lib.root_path, data["type"], data["name"], artist)

    if data["type"] == "track":
        folder = tracks_dir(lib.root_path)
        existing_state = load_state(folder)
        track_id = data["spotify_id"]
        already_in_library = existing_state is not None and track_id in existing_state.tracks
        downloaded_tracks = 0
        if already_in_library and existing_state:
            t = existing_state.tracks.get(track_id)
            if t and t.status == TrackStatus.downloaded:
                downloaded_tracks = 1
        return {**data, "already_in_library": already_in_library, "downloaded_tracks": downloaded_tracks}

    existing_state = load_state(folder)
    downloaded_tracks = 0
    if existing_state:
        existing_state = sync_file_existence(folder, existing_state)
        downloaded_tracks = sum(1 for t in existing_state.tracks.values() if t.status == TrackStatus.downloaded)

    return {**data, "already_in_library": existing_state is not None, "downloaded_tracks": downloaded_tracks}


class AddSourceRequest(BaseModel):
    url: str


@router.post("", status_code=201)
async def add_source(body: AddSourceRequest):
    lib = _active_library()
    try:
        data = await audio_engine.resolve_url(body.url)
    except Exception as exc:
        print(f"[BACKEND] add_source resolve failed for {body.url!r}: {exc}", flush=True)
        raise HTTPException(400, str(exc))

    if data["type"] == "track":
        folder = tracks_dir(lib.root_path)
        folder.mkdir(parents=True, exist_ok=True)
        async with get_state_lock(folder):
            state = load_state(folder)
            if state is None:
                state = SpotifyJson(
                    type=SourceType.track,
                    spotify_id="tracks",
                    spotify_url="",
                    name="Tracks",
                    artwork_url=None,
                    tracks={},
                )
            for i, t in enumerate(data.get("tracks", [])):
                duration_ms = t.get("duration_ms")
                state.tracks[t["id"]] = TrackState(
                    file=None,
                    status=TrackStatus.missing,
                    title=t.get("title"),
                    artist=", ".join(t.get("artists", [])),
                    position=t.get("track_number") or (i + 1),
                    expected_duration_s=duration_ms / 1000 if duration_ms else None,
                )
            save_state(folder, state)
        return _state_to_meta(folder, state)

    artist = ""
    if data["type"] == "album" and data.get("tracks"):
        artist = data["tracks"][0].get("album_artist", "")

    folder = _source_folder_path(lib.root_path, data["type"], data["name"], artist)
    folder.mkdir(parents=True, exist_ok=True)

    tracks = {
        t["id"]: TrackState(
            file=None,
            status=TrackStatus.missing,
            title=t.get("title"),
            artist=", ".join(t.get("artists", [])),
            position=t.get("track_number") or (i + 1),
            expected_duration_s=(t["duration_ms"] / 1000) if t.get("duration_ms") else None,
        )
        for i, t in enumerate(data.get("tracks", []))
    }
    state = SpotifyJson(
        type=SourceType(data["type"]),
        spotify_id=data["spotify_id"],
        spotify_url=data["spotify_url"],
        name=data["name"],
        artwork_url=data.get("artwork_url"),
        last_refreshed=datetime.now(timezone.utc).isoformat(),
        tracks=tracks,
    )
    async with get_state_lock(folder):
        save_state(folder, state)
    return _state_to_meta(folder, state)


@router.get("")
async def list_sources():
    # async (not `def`) so this runs on the event loop instead of FastAPI's
    # threadpool — sync `def` routes run on a real OS thread, and asyncio.Lock
    # (see get_state_lock) can't keep such a thread out of a source folder
    # while an async mutation is writing to it.
    lib = _active_library()
    results = scan_library(lib.root_path)
    return [_state_to_meta(folder, state) for folder, state in results]


@router.get("/{source_id}")
async def get_source(source_id: str):
    lib = _active_library()
    found = find_source(lib.root_path, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    active_jobs = download_queue.get_track_job_statuses(source_id)
    return _state_to_meta(folder, state, active_jobs)


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: str):
    lib = _active_library()
    found = find_source(lib.root_path, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    async with get_state_lock(folder):
        for track_state in state.tracks.values():
            if track_state.file:
                f = folder / track_state.file
                if f.exists():
                    f.unlink()
        state_file = folder / ".spotify.json"
        if state_file.exists():
            state_file.unlink()
        if folder != tracks_dir(lib.root_path):
            try:
                folder.rmdir()
            except OSError:
                pass


@router.delete("/{source_id}/tracks/{track_id}", status_code=204)
async def delete_track(source_id: str, track_id: str):
    lib = _active_library()
    found = find_source(lib.root_path, source_id)
    if not found:
        raise HTTPException(404, "Source not found")
    folder, state = found
    if track_id not in state.tracks:
        raise HTTPException(404, "Track not found")
    async with get_state_lock(folder):
        track = state.tracks[track_id]
        if track.file:
            f = folder / track.file
            if f.exists():
                f.unlink()
        if track.status == TrackStatus.removed_from_source:
            del state.tracks[track_id]
        else:
            track.file = None
            track.status = TrackStatus.missing
        save_state(folder, state)
