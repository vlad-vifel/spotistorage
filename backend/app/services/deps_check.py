import shutil
from typing import TypedDict


class DepsStatus(TypedDict):
    ffmpeg: bool
    yt_dlp: bool
    pycryptodome: bool
    all_ok: bool


def check_dependencies() -> DepsStatus:
    ffmpeg = shutil.which("ffmpeg") is not None
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
    return {
        "ffmpeg": ffmpeg,
        "yt_dlp": yt_dlp_ok,
        "pycryptodome": pycryptodome,
        "all_ok": ffmpeg and yt_dlp_ok and pycryptodome,
    }
