import asyncio
import time

_resolve_cache: dict[str, tuple[float, list[dict]]] = {}
_RESOLVE_TTL = 300.0


def cache_resolved_tracks(source_id: str, tracks: list[dict]) -> None:
    _resolve_cache[source_id] = (time.monotonic(), tracks)


def get_cached_tracks(source_id: str) -> list[dict] | None:
    entry = _resolve_cache.get(source_id)
    if entry and (time.monotonic() - entry[0]) < _RESOLVE_TTL:
        return entry[1]
    return None


def _detect_type(url: str) -> str:
    if "/playlist/" in url:
        return "playlist"
    if "/album/" in url:
        return "album"
    if "/user/" in url:
        return "user"
    return "track"


def _extract_id(url: str) -> str:
    return url.rstrip("/").split("/")[-1].split("?")[0]


def _best_image(images) -> str | None:
    if not images:
        return None
    best = max(images, key=lambda img: (img.width or 0))
    return best.url


def _best_http_image(images) -> str | None:
    http = [img for img in (images or []) if img.url and img.url.startswith("http")]
    if not http:
        return None
    return max(http, key=lambda img: (img.width or 0)).url


async def resolve_url(url: str) -> dict:
    from spotify_scraper import AsyncSpotifyClient

    source_type = _detect_type(url)

    async with AsyncSpotifyClient() as client:
        if source_type == "playlist":
            data = await client.get_playlist(url, max_tracks=None)
            name = data.name
            artwork_url = _best_image(getattr(data, "images", None) or [])
            tracks = []
            for i, pt in enumerate(data.tracks):
                t = pt.track
                t_artwork = _best_image(t.images or []) or (
                    _best_image(t.album.images or []) if t.album else None
                )
                year = str(t.release_date.year) if getattr(t, "release_date", None) else ""
                tracks.append({
                    "id": t.id,
                    "title": t.name,
                    "artists": [a.name for a in t.artists],
                    "album": t.album.name if t.album else "",
                    "album_artist": t.artists[0].name if t.artists else "",
                    "track_number": i + 1,
                    "disc_number": 1,
                    "year": year,
                    "artwork_url": t_artwork,
                    "duration_ms": getattr(t, "duration_ms", None),
                })

        elif source_type == "album":
            data = await client.get_album(url)
            name = data.name
            artwork_url = _best_image(getattr(data, "images", None) or [])
            album_artist = data.artists[0].name if data.artists else ""
            year = str(data.release_date.year) if getattr(data, "release_date", None) else ""
            tracks = []
            for i, t in enumerate(data.tracks):
                t_artwork = _best_image(t.images or []) if t.images else artwork_url
                tracks.append({
                    "id": t.id,
                    "title": t.name,
                    "artists": [a.name for a in t.artists],
                    "album": data.name,
                    "album_artist": album_artist,
                    "track_number": t.track_number or (i + 1),
                    "disc_number": 1,
                    "year": year,
                    "artwork_url": t_artwork or artwork_url,
                    "duration_ms": getattr(t, "duration_ms", None),
                })

        else:
            t = await client.get_track(url)
            name = t.name
            artwork_url = _best_image(t.images or []) or (
                _best_image(t.album.images or []) if t.album else None
            )
            year = str(t.release_date.year) if getattr(t, "release_date", None) else ""
            tracks = [{
                "id": t.id,
                "title": t.name,
                "artists": [a.name for a in t.artists],
                "album": t.album.name if t.album else "",
                "album_artist": t.artists[0].name if t.artists else "",
                "track_number": t.track_number or 1,
                "disc_number": 1,
                "year": year,
                "artwork_url": artwork_url,
                "duration_ms": getattr(t, "duration_ms", None),
            }]

    return {
        "type": source_type,
        "spotify_id": _extract_id(url),
        "spotify_url": url,
        "name": name,
        "artwork_url": artwork_url,
        "total_tracks": len(tracks),
        "tracks": tracks,
    }


async def resolve_user(url: str, sp_dc: str | None = None) -> dict:
    from spotify_scraper import AsyncSpotifyClient

    if not sp_dc:
        raise ValueError(
            "User profiles require a Spotify sp_dc cookie. "
            "Add it in Settings -> Spotify account."
        )

    user_id = _extract_id(url)
    async with AsyncSpotifyClient(cookies={"sp_dc": sp_dc}) as client:
        from spotify_scraper.api import user_profile as _up_api
        from spotify_scraper.api.parse_entities import parse_user_profile as _parse_user
        provider = client._cookie_provider()
        token = await provider.token()
        profile_url = _up_api.profile_url(user_id, playlist_limit=200, artist_limit=0)
        resp = await client._transport.get(profile_url, headers=_up_api.auth_headers(token))
        user = _parse_user(resp.json())

        async def _fetch_meta(stub) -> dict:
            pl_url = f"https://open.spotify.com/playlist/{stub.id}"
            stub_artwork = _best_http_image(stub.images or [])
            try:
                full = await client.get_playlist(pl_url, max_tracks=0)
                artwork = _best_http_image(full.images or []) or stub_artwork
                total = full.total_tracks or 0
            except Exception:
                artwork = stub_artwork
                total = 0
            return {
                "id": stub.id,
                "name": stub.name,
                "spotify_url": pl_url,
                "artwork_url": artwork,
                "total_tracks": total,
            }

        playlists = list(await asyncio.gather(*[_fetch_meta(p) for p in user.public_playlists]))

    return {
        "type": "user",
        "spotify_id": user.id,
        "name": user.name,
        "artwork_url": _best_image(user.images or []),
        "playlists": playlists,
    }
