import re

_FORBIDDEN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}
_MAX_COMPONENT = 200


def sanitize(name: str) -> str:
    name = _FORBIDDEN.sub("_", name)
    name = name.strip(". ")
    if name.upper() in _RESERVED:
        name = "_" + name
    return name[:_MAX_COMPONENT] or "_"


def track_filename(position: int, artists: list[str], title: str) -> str:
    pos = f"{position:02d}"
    art = sanitize(", ".join(artists))
    tit = sanitize(title)
    return f"{pos} - {art} - {tit}.mp3"


def standalone_filename(artists: list[str], title: str) -> str:
    art = sanitize(", ".join(artists))
    tit = sanitize(title)
    return f"{art} - {tit}.mp3"


def source_folder(source_type: str, name: str, artist: str = "") -> str:
    if source_type == "album":
        return sanitize(f"{artist} - {name}") if artist else sanitize(name)
    return sanitize(name)
