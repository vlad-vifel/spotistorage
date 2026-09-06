import hashlib
import json
import re
import urllib.request
import urllib.parse
import http.cookiejar
from pathlib import Path

from app.services.matching import rank_candidates, search_safe


def _make_opener(arl: str) -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    cookie = http.cookiejar.Cookie(
        version=0, name="arl", value=arl, port=None, port_specified=False,
        domain=".deezer.com", domain_specified=True, domain_initial_dot=True,
        path="/", path_specified=True, secure=True, expires=None,
        discard=False, comment=None, comment_url=None, rest={},
    )
    jar.set_cookie(cookie)
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def _gw(opener: urllib.request.OpenerDirector, api_token: str, method: str, body: dict) -> dict:
    url = (
        f"https://www.deezer.com/ajax/gw-light.php"
        f"?method={method}&input=3&api_version=1.0&api_token={urllib.parse.quote(api_token)}"
    )
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
    })
    with opener.open(req, timeout=15) as resp:
        return json.loads(resp.read())


def _get_stream_url(opener: urllib.request.OpenerDirector, license_token: str, track_token: str) -> tuple[str, str]:
    """Returns (url, format) using media.deezer.com/v1/get_url."""
    body = {
        "license_token": license_token,
        "media": [{
            "type": "FULL",
            "formats": [
                {"cipher": "BF_CBC_STRIPE", "format": "MP3_320"},
                {"cipher": "BF_CBC_STRIPE", "format": "MP3_128"},
                {"cipher": "BF_CBC_STRIPE", "format": "MP3_64"},
            ],
        }],
        "track_tokens": [track_token],
    }
    req = urllib.request.Request(
        "https://media.deezer.com/v1/get_url",
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
    )
    with opener.open(req, timeout=15) as r:
        resp = json.loads(r.read())

    data = resp.get("data") or []
    if not data:
        raise RuntimeError("media.deezer.com returned no data")
    media_list = data[0].get("media") or []
    if not media_list:
        errors = data[0].get("errors") or []
        raise RuntimeError(f"no media in response, errors={errors}")
    m = media_list[0]
    sources = m.get("sources") or []
    if not sources:
        raise RuntimeError("no sources in media response")
    return sources[0]["url"], m.get("format", "?")


def _blowfish_key(track_id: str) -> bytes:
    md5 = hashlib.md5(str(track_id).encode()).hexdigest()
    secret = "g4el58wc0zvf9na1"
    return bytes(ord(md5[i]) ^ ord(md5[i + 16]) ^ ord(secret[i]) for i in range(16))


def _decrypt(data: bytes, track_id: str) -> bytes:
    from Crypto.Cipher import Blowfish
    key = _blowfish_key(track_id)
    iv = b"\x00\x01\x02\x03\x04\x05\x06\x07"
    out = bytearray()
    for i in range(0, len(data), 2048):
        chunk = data[i: i + 2048]
        if (i // 2048) % 3 == 0 and len(chunk) == 2048:
            chunk = Blowfish.new(key, Blowfish.MODE_CBC, iv).decrypt(chunk)
        out.extend(chunk)
    return bytes(out)


def _authenticate(arl: str) -> tuple[urllib.request.OpenerDirector, str, str]:
    opener = _make_opener(arl)
    user_resp = _gw(opener, "null", "deezer.getUserData", {})
    results = user_resp.get("results", {})
    user_id = results.get("USER", {}).get("USER_ID", 0)
    if user_id == 0:
        raise RuntimeError("invalid or expired ARL token")
    api_token = results["checkForm"]
    license_token = results.get("USER", {}).get("OPTIONS", {}).get("license_token", "")
    return opener, api_token, license_token


def _fetch_track(
    opener: urllib.request.OpenerDirector,
    api_token: str,
    license_token: str,
    track_id: str,
    output_path: Path,
) -> str:
    """Downloads and decrypts a known Deezer track ID to output_path. Returns the format string."""
    song_resp = _gw(opener, api_token, "song.getData", {"SNG_ID": track_id})
    track_data = song_resp.get("results", {})
    track_token = track_data.get("TRACK_TOKEN", "")
    if not track_token:
        raise RuntimeError("TRACK_TOKEN missing from song.getData")

    stream_url, fmt = _get_stream_url(opener, license_token, track_token)

    req = urllib.request.Request(stream_url, headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req, timeout=120) as r:
        raw = r.read()

    decrypted = _decrypt(raw, track_id)
    output_path.write_bytes(decrypted)
    return fmt


def extract_track_id(url: str) -> str:
    """Extracts a Deezer track ID from a track URL, following redirects for
    shortened links (deezer.page.link, link.deezer.com, etc.)."""
    m = re.search(r"/track/(\d+)", url)
    if m:
        return m.group(1)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        final_url = r.geturl()
    m = re.search(r"/track/(\d+)", final_url)
    if m:
        return m.group(1)
    raise ValueError("Could not find a Deezer track ID in this URL")


def download_from_deezer_id(track_id: str, arl: str, output_path: Path) -> dict:
    """Downloads a specific, already-known Deezer track ID (manual-URL retry path)."""
    opener, api_token, license_token = _authenticate(arl)
    song_resp = _gw(opener, api_token, "song.getData", {"SNG_ID": track_id})
    track_data = song_resp.get("results", {})
    title = track_data.get("SNG_TITLE", "")
    artist = track_data.get("ART_NAME", "")
    fmt = _fetch_track(opener, api_token, license_token, track_id, output_path)
    print(f"[Deezer] {artist} - {title} → {fmt} ({output_path.stat().st_size // 1024}KB)", flush=True)
    return {"title": title, "artist": artist}


def download_from_deezer(
    artists: list[str],
    title: str,
    arl: str,
    output_path: Path,
    expected_duration_s: float | None = None,
    duration_threshold: float = 10.0,
) -> None:
    opener, api_token, license_token = _authenticate(arl)

    primary = search_safe(artists[0]) if artists else ""
    safe_title = search_safe(title)
    queries = []
    if primary:
        queries.append(f'artist:"{primary}" track:"{safe_title}"')
    queries.append(f"{primary} {safe_title}".strip())

    seen_ids: set[str] = set()
    candidates: list[dict] = []
    for q in queries:
        query_str = urllib.parse.quote(q)
        try:
            with urllib.request.urlopen(
                f"https://api.deezer.com/search?q={query_str}&limit=10", timeout=10
            ) as r:
                search = json.loads(r.read())
        except Exception:
            continue
        for item in search.get("data") or []:
            tid = str(item["id"])
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            candidates.append({
                "id": tid,
                "title": item.get("title", ""),
                "channel": (item.get("artist") or {}).get("name", ""),
                "duration": item.get("duration"),
            })

    ranked = rank_candidates(candidates, title, artists, expected_duration_s, duration_threshold)
    if not ranked:
        raise RuntimeError("no matching track found")

    track_id = ranked[0]["id"]
    fmt = _fetch_track(opener, api_token, license_token, track_id, output_path)
    print(f"[Deezer] {ranked[0]['channel']} - {ranked[0]['title']} → {fmt} ({output_path.stat().st_size // 1024}KB)", flush=True)
