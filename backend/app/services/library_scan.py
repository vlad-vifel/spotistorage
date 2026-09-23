import logging
from pathlib import Path

from app.models.source import SpotifyJson
from app.services.state_store import load_state, sync_file_existence

logger = logging.getLogger(__name__)


def scan_library(library_root: str) -> list[tuple[Path, SpotifyJson]]:
    root = Path(library_root)
    results: list[tuple[Path, SpotifyJson]] = []

    for subdir in ("Playlists", "Albums"):
        base = root / subdir
        if not base.exists():
            continue
        for folder in base.iterdir():
            if not folder.is_dir():
                continue
            try:
                state = load_state(folder)
            except Exception:
                logger.warning("Skipping corrupted state: %s", folder)
                continue
            if state is None:
                continue
            state = sync_file_existence(folder, state)
            results.append((folder, state))

    tracks_base = root / "Tracks"
    if tracks_base.exists():
        try:
            state = load_state(tracks_base)
        except Exception:
            logger.warning("Skipping corrupted tracks state")
            state = None
        if state is not None:
            state = sync_file_existence(tracks_base, state)
            results.append((tracks_base, state))

    return results
