from datetime import datetime, timezone
from pathlib import Path
import os
from app.services import audio_engine
from app.services.state_store import save_state, sync_file_existence
from app.services.filenames import track_filename
from app.core.state_locks import get_state_lock
from app.models.source import SpotifyJson, TrackState, TrackStatus


async def refresh_source_state(folder: Path, state: SpotifyJson) -> tuple[SpotifyJson, dict]:
    resolved = await audio_engine.resolve_url(state.spotify_url)
    async with get_state_lock(folder):
        return _apply_refresh(folder, state, resolved)


def _apply_refresh(folder: Path, state: SpotifyJson, resolved: dict) -> tuple[SpotifyJson, dict]:
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
        if t.title is None:
            t.title = rt.get("title")
            t.artist = ", ".join(rt.get("artists", []))
        t.position = rt.get("track_number")
        duration_ms = rt.get("duration_ms")
        if duration_ms:
            t.expected_duration_s = duration_ms / 1000

    if resolved.get("artwork_url"):
        state.artwork_url = resolved["artwork_url"]

    renamed = 0
    if state.type.value in ("playlist", "album"):
        renamed = _rename_repositioned_tracks(folder, state, resolved_by_id)

    state.last_refreshed = datetime.now(timezone.utc).isoformat()
    save_state(folder, state)
    state = sync_file_existence(folder, state)
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


def _rename_repositioned_tracks(
    folder: Path,
    state: SpotifyJson,
    resolved_by_id: dict[str, dict],
) -> int:
    to_rename = []
    for tid, t in state.tracks.items():
        if not t.file or tid not in resolved_by_id:
            continue
        rt = resolved_by_id[tid]
        new_pos = rt.get("track_number")
        if new_pos is None or t.position == new_pos:
            continue
        artists = rt.get("artists") or ([t.artist] if t.artist else ["Unknown"])
        new_name = track_filename(new_pos, artists, t.title or "")
        old_path = folder / t.file
        if old_path.exists() and t.file != new_name:
            to_rename.append((tid, old_path, folder / new_name, new_name, new_pos))

    if not to_rename:
        return 0

    tmp_paths: list[Path] = []
    for _, old_path, _, _, new_pos in to_rename:
        tmp_path = folder / f".tmp-track-{new_pos:03d}.mp3"
        os.replace(old_path, tmp_path)
        tmp_paths.append(tmp_path)

    for i, (tid, _, final_path, new_name, new_pos) in enumerate(to_rename):
        os.replace(tmp_paths[i], final_path)
        state.tracks[tid].file = new_name
        state.tracks[tid].position = new_pos

    return len(to_rename)
