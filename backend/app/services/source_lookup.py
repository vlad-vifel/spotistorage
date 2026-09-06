from pathlib import Path
from app.models.source import SpotifyJson
from app.services.library_scan import scan_library


def find_source(library_root: str, source_id: str) -> tuple[Path, SpotifyJson] | None:
    for folder, state in scan_library(library_root):
        if state.spotify_id == source_id:
            return folder, state
    return None
