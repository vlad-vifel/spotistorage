from datetime import datetime, timezone
from pathlib import Path
import os
import re
import uuid
from app.services import audio_engine
from app.services.state_store import save_state, sync_file_existence
from app.services.state_store import load_state
from app.services.filenames import track_filename
from app.core.state_locks import get_state_lock
from app.models.source import SpotifyJson, TrackState, TrackStatus


async def refresh_source_state(folder: Path, state: SpotifyJson) -> tuple[SpotifyJson, dict]:
    resolved = await audio_engine.resolve_url(state.spotify_url)
    async with get_state_lock(folder):
        fresh_state = load_state(folder)
        return _apply_refresh(folder, fresh_state or state, resolved)


def _apply_refresh(folder: Path, state: SpotifyJson, resolved: dict) -> tuple[SpotifyJson, dict]:
    renamed = 0
    if state.type.value in ("playlist", "album"):
        # Normalize legacy two-digit files before checking whether a Spotify
        # track was removed. Otherwise a migrated file could be mistaken for a
        # missing one and lose its state entry.
        renamed += _normalize_track_filenames(folder, state)

    resolved_by_id = {t["id"]: t for t in resolved.get("tracks", [])}
    remote_ids = set(resolved_by_id.keys())
    local_ids = set(state.tracks.keys())

    new_ids = remote_ids - local_ids
    removed_ids = local_ids - remote_ids

    for tid in new_ids:
        rt = resolved_by_id[tid]
        duration_ms = rt.get("duration_ms")
        state.tracks[tid] = TrackState(
            file=None,
            status=TrackStatus.missing,
            title=rt.get("title"),
            artist=", ".join(rt.get("artists", [])),
            position=rt.get("track_number"),
            expected_duration_s=duration_ms / 1000 if duration_ms else None,
        )

    ghost_ids = []
    for tid in removed_ids:
        t = state.tracks[tid]
        has_file = bool(t.file) and (folder / t.file).exists() if t.file else False
        if has_file:
            t.status = TrackStatus.removed_from_source
        else:
            ghost_ids.append(tid)
    for tid in ghost_ids:
        del state.tracks[tid]

    for tid, t in state.tracks.items():
        if tid not in resolved_by_id:
            continue
        rt = resolved_by_id[tid]
        t.title = rt.get("title")
        t.artist = ", ".join(rt.get("artists", []))
        t.position = rt.get("track_number")
        duration_ms = rt.get("duration_ms")
        if duration_ms:
            t.expected_duration_s = duration_ms / 1000

    if resolved.get("artwork_url"):
        state.artwork_url = resolved["artwork_url"]

    if state.type.value in ("playlist", "album"):
        renamed += _normalize_track_filenames(folder, state)

    state.last_refreshed = datetime.now(timezone.utc).isoformat()
    save_state(folder, state)
    state = sync_file_existence(folder, state)
    save_state(folder, state)
    wrong = _check_track_durations(folder, state)
    if wrong > 0:
        save_state(folder, state)

    return state, {
        "new": len(new_ids),
        "renamed": renamed,
        "downloaded": sum(1 for t in state.tracks.values() if t.status == TrackStatus.downloaded),
        "missing": sum(1 for t in state.tracks.values() if t.status == TrackStatus.missing),
        "removed_from_source": sum(
            1 for t in state.tracks.values() if t.status == TrackStatus.removed_from_source
        ),
        "wrong_track": wrong,
    }


_DURATION_THRESHOLD = 10.0


def _check_track_durations(folder: Path, state: SpotifyJson) -> int:
    try:
        from mutagen.mp3 import MP3 as _MP3
    except ImportError:
        return 0

    flagged = 0
    for t in state.tracks.values():
        if t.status != TrackStatus.downloaded:
            continue
        if not t.file or not t.expected_duration_s or t.expected_duration_s <= 0:
            continue
        mp3_path = folder / t.file
        if not mp3_path.exists():
            continue
        try:
            actual_s = _MP3(str(mp3_path)).info.length
            if abs(actual_s - t.expected_duration_s) > _DURATION_THRESHOLD:
                t.status = TrackStatus.wrong_track
                flagged += 1
        except Exception:
            pass
    return flagged


def _normalize_track_filenames(folder: Path, state: SpotifyJson) -> int:
    to_rename = []
    state_only_updates: list[tuple[str, str]] = []
    for tid, t in state.tracks.items():
        if not t.file:
            continue
        new_name = _normalized_track_name(t)
        if not new_name or t.file == new_name:
            continue
        old_path = folder / t.file
        new_path = folder / new_name
        if old_path.exists():
            to_rename.append((tid, old_path, new_path, new_name))
        elif new_path.exists():
            state_only_updates.append((tid, new_name))

    for tid, new_name in state_only_updates:
        state.tracks[tid].file = new_name

    renamed = len(state_only_updates)
    if not to_rename:
        return renamed

    old_paths = {old_path for _, old_path, _, _ in to_rename}
    safe_to_rename = [
        item for item in to_rename
        if not item[2].exists() or item[2] in old_paths
    ]
    if not safe_to_rename:
        return renamed

    staged: list[tuple[str, Path, Path, Path, str]] = []
    completed: list[tuple[str, Path, Path, Path, str]] = []
    try:
        for tid, old_path, final_path, new_name in safe_to_rename:
            tmp_path = folder / f".tmp-track-normalize-{uuid.uuid4().hex}.mp3"
            os.replace(old_path, tmp_path)
            staged.append((tid, old_path, tmp_path, final_path, new_name))
        for item in staged:
            _, _, tmp_path, final_path, _ = item
            os.replace(tmp_path, final_path)
            completed.append(item)
    except OSError:
        for _, old_path, _, final_path, _ in reversed(completed):
            if final_path.exists() and not old_path.exists():
                os.replace(final_path, old_path)
        for _, old_path, tmp_path, _, _ in reversed(staged):
            if tmp_path.exists() and not old_path.exists():
                os.replace(tmp_path, old_path)
        return renamed

    for tid, _, _, _, new_name in staged:
        state.tracks[tid].file = new_name

    return renamed + len(staged)


def _normalized_track_name(track: TrackState) -> str | None:
    if track.position and track.title and track.artist:
        artists = [artist.strip() for artist in track.artist.split(",") if artist.strip()]
        return track_filename(track.position, artists, track.title)

    if not track.file:
        return None
    match = re.match(r"^(\d+)(\s+-\s+.*)$", Path(track.file).name)
    if not match:
        return None
    return f"{int(match.group(1)):03d}{match.group(2)}"
