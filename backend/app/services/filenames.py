import hashlib
import re

_FORBIDDEN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}
_MAX_COMPONENT = 200
_MAX_FILENAME = 240
_MP3_SUFFIX = ".mp3"


def _audio_filename(prefix: str | None, artist: str, title: str) -> str:
    parts = [part for part in (prefix, artist, title) if part is not None]
    stem = " - ".join(parts)
    if len(stem) + len(_MP3_SUFFIX) <= _MAX_FILENAME:
        return f"{stem}{_MP3_SUFFIX}"

    digest = hashlib.sha1(stem.encode("utf-8")).hexdigest()[:8]
    marker = f"~{digest}"
    available = _MAX_FILENAME - len(_MP3_SUFFIX) - len(marker)
    separators = len(parts) - 1
    variable_budget = available - len(prefix or "") - separators * 3
    artist_limit = min(len(artist), max(1, variable_budget // 2))
    title_limit = min(len(title), max(1, variable_budget - artist_limit))
    remaining = variable_budget - artist_limit - title_limit
    if remaining > 0:
        extra_artist = min(len(artist) - artist_limit, remaining)
        artist_limit += extra_artist
        remaining -= extra_artist
        title_limit += min(len(title) - title_limit, remaining)

    short_artist = artist[:artist_limit].rstrip(". ") or "_"
    short_title = title[:title_limit].rstrip(". ") or "_"
    short_parts = [part for part in (prefix, short_artist, short_title) if part is not None]
    return f"{' - '.join(short_parts)}{marker}{_MP3_SUFFIX}"


def sanitize(name: str) -> str:
    name = _FORBIDDEN.sub("_", name)
    name = name.strip(". ")
    if name.upper() in _RESERVED:
        name = "_" + name
    return name[:_MAX_COMPONENT] or "_"


def track_filename(position: int, artists: list[str], title: str) -> str:
    pos = f"{position:03d}"
    art = sanitize(", ".join(artists))
    tit = sanitize(title)
    return _audio_filename(pos, art, tit)


def standalone_filename(artists: list[str], title: str) -> str:
    art = sanitize(", ".join(artists))
    tit = sanitize(title)
    return _audio_filename(None, art, tit)


def source_folder(source_type: str, name: str, artist: str = "") -> str:
    if source_type == "album":
        return sanitize(f"{artist} - {name}") if artist else sanitize(name)
    return sanitize(name)
