import json
import logging
import re
import threading
import time
import urllib.request
from importlib.metadata import PackageNotFoundError, version
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/app", tags=["app"])

RELEASES_URL = "https://github.com/vlad-vifel/spotistorage/releases"
_LATEST_RELEASE_API = "https://api.github.com/repos/vlad-vifel/spotistorage/releases/latest"
_CACHE_TTL = 6 * 60 * 60

_cache: dict = {"at": 0.0, "release": None}
_cache_lock = threading.Lock()


def current_version() -> str | None:
    try:
        return version("spotistorage-backend")
    except PackageNotFoundError:
        return None


def parse_version(value: str | None) -> tuple[int, ...] | None:
    match = re.fullmatch(r"v?(\d+(?:\.\d+)*)", (value or "").strip())
    return tuple(int(part) for part in match.group(1).split(".")) if match else None


def _fetch_latest_release() -> dict | None:
    request = urllib.request.Request(_LATEST_RELEASE_API, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "SpotiStorage",
    })
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.load(response)
        return {"tag": data["tag_name"], "url": data.get("html_url") or RELEASES_URL}
    except Exception as exc:
        logger.info("Update check failed: %s", exc)
        return None


def _latest_release() -> dict | None:
    with _cache_lock:
        if _cache["release"] is not None and time.monotonic() - _cache["at"] < _CACHE_TTL:
            return _cache["release"]
        release = _fetch_latest_release()
        if release is not None:
            _cache.update(at=time.monotonic(), release=release)
        return release


def update_info(current: str | None, release: dict | None) -> dict:
    latest = release["tag"].lstrip("v") if release else None
    current_parsed, latest_parsed = parse_version(current), parse_version(latest)
    return {
        "current_version": current,
        "latest_version": latest,
        "update_available": bool(current_parsed and latest_parsed and latest_parsed > current_parsed),
        "release_url": release["url"] if release else RELEASES_URL,
    }


@router.get("/update")
def check_update():
    return update_info(current_version(), _latest_release())
