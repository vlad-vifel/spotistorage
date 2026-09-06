"""Facade kept for backward compatibility — resolve logic lives in
spotify_resolve.py, download/matching logic lives in yt_download.py."""
from app.services.spotify_resolve import (
    resolve_url,
    resolve_user,
    cache_resolved_tracks,
    get_cached_tracks,
)
from app.services.yt_download import download_track, download_from_url

__all__ = [
    "resolve_url",
    "resolve_user",
    "cache_resolved_tracks",
    "get_cached_tracks",
    "download_track",
    "download_from_url",
]
