import shutil
from typing import TypedDict
from app.core.paths import resolve_ffmpeg_paths, resolve_quickjs_path


class DepsStatus(TypedDict):
    ffmpeg: bool
    ffprobe: bool
    yt_dlp: bool
    pycryptodome: bool
    js_runtime: bool
    all_ok: bool


def check_dependencies() -> DepsStatus:
    ffmpeg_path, ffprobe_path = resolve_ffmpeg_paths()
    ffmpeg = shutil.which(ffmpeg_path) is not None
    ffprobe = shutil.which(ffprobe_path) is not None
    try:
        import yt_dlp  # noqa: F401
        yt_dlp_ok = True
    except ImportError:
        yt_dlp_ok = False
    try:
        import Crypto  # noqa: F401
        pycryptodome = True
    except ImportError:
        pycryptodome = False
    js_runtime = shutil.which(resolve_quickjs_path()) is not None
    return {
        "ffmpeg": ffmpeg,
        "ffprobe": ffprobe,
        "yt_dlp": yt_dlp_ok,
        "pycryptodome": pycryptodome,
        "js_runtime": js_runtime,
        "all_ok": ffmpeg and ffprobe and yt_dlp_ok and pycryptodome and js_runtime,
    }
