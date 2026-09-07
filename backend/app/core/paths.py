import os
import sys
from pathlib import Path


def resolve_ffmpeg_paths() -> tuple[str, str]:
    location = ffmpeg_location_env()
    if not location:
        return "ffmpeg", "ffprobe"
    p = Path(location)
    if p.is_dir():
        return str(p / "ffmpeg"), str(p / "ffprobe")
    filename = p.name
    basename = "ffmpeg" if "ffmpeg" in filename else "ffprobe" if "ffprobe" in filename else "ffmpeg"
    dirname = p.parent
    resolved = {}
    for prog in ("ffmpeg", "ffprobe"):
        candidate = dirname / filename.replace(basename, prog)
        resolved[prog] = str(candidate) if candidate.exists() else str(dirname / prog)
    return resolved["ffmpeg"], resolved["ffprobe"]


def config_dir() -> Path:
    return Path(os.environ.get("SPOTISTORAGE_CONFIG_DIR", str(Path(__file__).parents[3] / "config")))


def ffmpeg_location_env() -> str | None:
    return os.environ.get("SPOTISTORAGE_FFMPEG_DIR")


def resolve_quickjs_path() -> str:
    env_path = os.environ.get("SPOTISTORAGE_QUICKJS_PATH")
    if env_path:
        return env_path
    bundled_name = "qjs.exe" if sys.platform == "win32" else "qjs"
    bundled = Path(__file__).parents[2] / "bin" / bundled_name
    if bundled.is_file():
        return str(bundled)
    return "quickjs"


def resolve_safe(library_root: str, *parts: str) -> Path:
    root = Path(library_root).resolve()
    target = root.joinpath(*parts).resolve()
    if target != root and not target.is_relative_to(root):
        raise ValueError(f"Path traversal attempt: {target}")
    return target


def playlists_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Playlists")


def albums_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Albums")


def tracks_dir(library_root: str) -> Path:
    return resolve_safe(library_root, "Tracks")
