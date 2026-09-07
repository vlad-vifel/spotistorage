import json
from pathlib import Path
from app.core.atomic_write import write_json_atomic
from app.core.compat import model_dump
from app.models.source import SpotifyJson, TrackState, TrackStatus

_STATE_FILE = ".spotify.json"


def load_state(folder: Path) -> SpotifyJson | None:
    path = folder / _STATE_FILE
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    tracks = {tid: TrackState(**t) for tid, t in data.get("tracks", {}).items()}
    data["tracks"] = tracks
    return SpotifyJson(**data)


def save_state(folder: Path, state: SpotifyJson) -> None:
    path = folder / _STATE_FILE
    payload = model_dump(state)
    payload["tracks"] = {
        tid: {k: v for k, v in t.items() if v is not None or k in ("file", "status")}
        for tid, t in payload["tracks"].items()
    }
    write_json_atomic(path, payload)


def sync_file_existence(folder: Path, state: SpotifyJson) -> SpotifyJson:
    from app.services.filenames import track_filename, standalone_filename

    existing_mp3s: set[str] | None = None
    changed = False

    for tid, track in state.tracks.items():
        if track.file:
            exists = (folder / track.file).exists()
            wanted = TrackStatus.downloaded if exists else TrackStatus.missing
            _stable = (TrackStatus.removed_from_source,) + ((TrackStatus.wrong_track,) if exists else ())
            if track.status != wanted and track.status not in _stable:
                track.status = wanted
                changed = True
        elif track.status == TrackStatus.missing and track.title and track.artist:
            if existing_mp3s is None:
                existing_mp3s = {f.name for f in folder.glob("*.mp3")}
            artists = [a.strip() for a in track.artist.split(",")]
            if state.type.value in ("playlist", "album") and track.position:
                expected = track_filename(track.position, artists, track.title)
            else:
                expected = standalone_filename(artists, track.title)
            if expected in existing_mp3s:
                track.file = expected
                track.status = TrackStatus.downloaded
                changed = True

    if changed:
        save_state(folder, state)
    return state
