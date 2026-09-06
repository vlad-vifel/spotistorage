from app.models.source import SpotifyJson, TrackStatus
from app.services import audio_engine


async def resolve_source_tracks(source_id: str, spotify_url: str) -> dict[str, dict]:
    """Resolves a source's current tracklist on Spotify, using the short-lived
    resolve cache when available, and refreshes that cache."""
    cached = audio_engine.get_cached_tracks(source_id)
    if cached is not None:
        return {t["id"]: t for t in cached}
    resolved = await audio_engine.resolve_url(spotify_url)
    tracks = resolved.get("tracks", [])
    audio_engine.cache_resolved_tracks(source_id, tracks)
    return {t["id"]: t for t in tracks}


def missing_track_ids(state: SpotifyJson, exclude: set[str]) -> set[str]:
    return {
        tid for tid, t in state.tracks.items()
        if t.status in (TrackStatus.missing, TrackStatus.wrong_track) and tid not in exclude
    }
