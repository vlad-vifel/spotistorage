import asyncio
import uuid
from pathlib import Path
from typing import Callable

_DURATION_THRESHOLD = 10.0
_YOUTUBE_HOSTS = ("youtube.com", "youtu.be")


def _mp3_bitrate_kbps(path: Path) -> int | None:
    try:
        from mutagen.mp3 import MP3
        return MP3(str(path)).info.bitrate // 1000
    except Exception:
        return None


def _combined_error(deezer_error: str | None, youtube_error: str | None, default: str) -> RuntimeError:
    parts = []
    if deezer_error:
        parts.append(f"Deezer: {deezer_error}")
    if youtube_error:
        parts.append(f"YouTube: {youtube_error}")
    if not parts:
        return RuntimeError(default)
    # each part ends with a period so the split is visible even when collapsed onto one line
    parts = [p if p.endswith((".", "!", "?")) else f"{p}." for p in parts]
    return RuntimeError("\n".join(parts))


def _find_node_path() -> str:
    import sys
    nvm_dir = Path.home() / "AppData" / "Roaming" / "nvm"
    if nvm_dir.exists():
        candidates = sorted(
            [d for d in nvm_dir.iterdir() if d.name.startswith("v")],
            key=lambda d: tuple(int(x) for x in d.name[1:].split(".")[:3]),
            reverse=True,
        )
        for c in candidates:
            major = int(c.name[1:].split(".")[0])
            if major >= 22:
                exe = c / ("node.exe" if sys.platform == "win32" else "bin/node")
                if exe.exists():
                    return str(exe)
    return "node"


def _is_youtube_url(url: str) -> bool:
    return any(h in url for h in _YOUTUBE_HOSTS)


def _is_deezer_url(url: str) -> bool:
    return "deezer.com" in url or "deezer.page.link" in url


def _base_ydl_opts(
    outtmpl: str,
    node_path: str,
    *,
    use_cookies: bool,
    youtube_cookies_path: str | None,
    youtube_browser: str | None,
) -> dict:
    opts = {
        "format": "bestaudio/best",
        "outtmpl": outtmpl,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
        "js_runtimes": {"node": {"path": node_path}},
        "remote_components": ["ejs:github"],
        "extractor_args": {"youtube": {"player_client": ["mweb", "android", "web"]}},
        "retries": 10,
        "fragment_retries": 10,
        "sleep_interval_requests": 1,
        "quiet": True,
        "no_warnings": True,
    }
    if use_cookies:
        if youtube_browser:
            opts["cookiesfrombrowser"] = (youtube_browser,)
        elif youtube_cookies_path:
            opts["cookiefile"] = youtube_cookies_path
    return opts


async def download_track(
    track_id: str,
    output_dir: Path,
    *,
    artist: str = "",
    title: str = "",
    youtube_cookies_path: str | None = None,
    youtube_browser: str | None = None,
    deezer_arl: str | None = None,
    expected_duration_s: float | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> tuple[Path, dict]:
    def _download() -> tuple[Path, dict]:
        import yt_dlp
        from app.services.deezer import download_from_deezer
        from app.services.matching import rank_candidates, search_safe

        temp_id = str(uuid.uuid4())[:8]
        outtmpl = str(output_dir / f"_dl_{temp_id}.%(ext)s")
        mp3_path = output_dir / f"_dl_{temp_id}.mp3"

        # Clean up any leftover temp files from previous interrupted downloads
        for leftover in output_dir.glob("_dl_*"):
            try:
                leftover.unlink()
            except OSError:
                pass

        artists = [a.strip() for a in artist.split(",") if a.strip()] if artist else []
        deezer_error: str | None = None
        youtube_error: str | None = None

        def _check_duration(path: Path) -> str | None:
            """Returns an error message if the file's duration doesn't match, else None."""
            if not expected_duration_s or expected_duration_s <= 0:
                return None
            try:
                from mutagen.mp3 import MP3 as _MP3
                actual_s = _MP3(str(path)).info.length
            except Exception:
                return None
            if abs(actual_s - expected_duration_s) > _DURATION_THRESHOLD:
                return f"Duration mismatch: expected {expected_duration_s:.0f}s, got {actual_s:.0f}s"
            return None

        # 1. Deezer first
        if deezer_arl and artists and title:
            try:
                download_from_deezer(
                    artists, title, deezer_arl, mp3_path,
                    expected_duration_s=expected_duration_s,
                    duration_threshold=_DURATION_THRESHOLD,
                )
                if mp3_path.exists() and mp3_path.stat().st_size >= 10_000:
                    dur_error = _check_duration(mp3_path)
                    if dur_error is None:
                        return mp3_path, {"source": "deezer", "bitrate_kbps": _mp3_bitrate_kbps(mp3_path)}
                    mp3_path.unlink(missing_ok=True)
                    deezer_error = dur_error
                else:
                    mp3_path.unlink(missing_ok=True)
                    deezer_error = "downloaded file is empty"
            except Exception as e:
                deezer_error = str(e)
                print(f"[Deezer] {e}", flush=True)

        # 2. YouTube fallback
        if artists and title:
            primary = search_safe(artists[0])
            safe_title = search_safe(title)
            queries = [f'ytsearch10:"{safe_title}" {primary}', f"ytsearch10:{primary} - {safe_title}"]
        else:
            queries = [f"ytsearch5:{track_id}"]

        def hook(d: dict) -> None:
            if not on_progress or d.get("status") != "downloading":
                return
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes")
            if total:
                on_progress(min(downloaded / total, 1.0) * 0.9)

        class _DebugLogger:
            def debug(self, msg: str) -> None:
                low = msg.lower()
                if any(k in low for k in ("[youtube]", "[youtube:search]", "extracting url", "downloading", "checking")):
                    print(f"[YT] {msg}", flush=True)
            def warning(self, msg: str) -> None:
                print(f"[YT warn] {msg}", flush=True)
            def error(self, msg: str) -> None:
                print(f"[YT error] {msg}", flush=True)

        node_path = _find_node_path()

        def _ydl_opts(use_cookies: bool) -> dict:
            opts = _base_ydl_opts(
                outtmpl, node_path,
                use_cookies=use_cookies,
                youtube_cookies_path=youtube_cookies_path,
                youtube_browser=youtube_browser,
            )
            opts["progress_hooks"] = [hook]
            opts["logger"] = _DebugLogger()
            return opts

        has_cookies = bool(youtube_browser or youtube_cookies_path)

        print(f"[YT] Searching: {queries}", flush=True)

        seen_ids: set[str] = set()
        all_entries: list[dict] = []
        flat_opts = {
            "extract_flat": "in_playlist",
            "quiet": True,
            "no_warnings": True,
            "logger": _DebugLogger(),
        }
        for query in queries:
            try:
                with yt_dlp.YoutubeDL(flat_opts) as ydl:
                    info = ydl.extract_info(query, download=False)
            except Exception as e:
                print(f"[YT] Search error for {query!r}: {e}", flush=True)
                continue
            if not info:
                continue
            entries = (
                [e for e in (info.get("entries") or []) if e]
                if info.get("_type") in ("playlist", "multi_video")
                else [info]
            )
            for e in entries:
                vid = e.get("id")
                if vid and vid in seen_ids:
                    continue
                if vid:
                    seen_ids.add(vid)
                all_entries.append(e)

        if not all_entries:
            mp3_path.unlink(missing_ok=True)
            raise _combined_error(deezer_error, "no results found", "No source could provide this track")

        candidates = [
            {
                "title": e.get("title") or "",
                "channel": e.get("channel") or e.get("uploader") or "",
                "duration": e.get("duration"),
                "_entry": e,
            }
            for e in all_entries
        ]
        ranked = rank_candidates(candidates, title, artists, expected_duration_s, _DURATION_THRESHOLD)
        if not ranked:
            mp3_path.unlink(missing_ok=True)
            raise _combined_error(
                deezer_error,
                f"no acceptable match for '{title}' by {', '.join(artists)}",
                "No source could provide this track",
            )

        for cand in ranked[:3]:
            entry = cand["_entry"]
            cand_dur = entry.get("duration")
            cand_id = entry.get("id") or entry.get("url", "").split("?v=")[-1]
            direct_url = entry.get("url") or entry.get("webpage_url") or f"https://www.youtube.com/watch?v={cand_id}"
            print(f"[YT] Trying '{entry.get('title')}' dur={cand_dur}s → {direct_url[:60]}", flush=True)

            if mp3_path.exists():
                mp3_path.unlink()

            def _attempt(use_cookies: bool) -> bool:
                nonlocal youtube_error
                try:
                    with yt_dlp.YoutubeDL(_ydl_opts(use_cookies)) as ydl:
                        ydl.download([direct_url])
                    return True
                except Exception as dl_exc:
                    youtube_error = str(dl_exc)
                    print(f"[YT] Download error: {dl_exc}", flush=True)
                    mp3_path.unlink(missing_ok=True)
                    return False

            ok = _attempt(False)
            if not ok and youtube_error and "Sign in to confirm your age" in youtube_error and has_cookies:
                print("[YT] Age-restricted, retrying with cookies", flush=True)
                ok = _attempt(True)

            if not ok:
                continue

            if not (mp3_path.exists() and mp3_path.stat().st_size >= 10_000):
                mp3_path.unlink(missing_ok=True)
                youtube_error = "downloaded file is empty"
                continue

            dur_error = _check_duration(mp3_path)
            if dur_error is not None:
                print(f"[YT] Post-check fail: {dur_error}", flush=True)
                mp3_path.unlink(missing_ok=True)
                youtube_error = dur_error
                continue

            return mp3_path, {"source": "youtube", "bitrate_kbps": _mp3_bitrate_kbps(mp3_path)}

        mp3_path.unlink(missing_ok=True)
        raise _combined_error(deezer_error, youtube_error, "yt-dlp did not find the track or ffmpeg is unavailable")

    return await asyncio.to_thread(_download)


async def download_from_url(
    url: str,
    output_dir: Path,
    *,
    youtube_cookies_path: str | None = None,
    youtube_browser: str | None = None,
    deezer_arl: str | None = None,
) -> tuple[Path, dict]:
    """Downloads a track from a user-supplied Deezer or YouTube URL directly,
    bypassing search and duration/keyword matching entirely — used when the
    user manually points a failed track at a specific source."""

    def _download() -> tuple[Path, dict]:
        temp_id = str(uuid.uuid4())[:8]
        outtmpl = str(output_dir / f"_dl_{temp_id}.%(ext)s")
        mp3_path = output_dir / f"_dl_{temp_id}.mp3"

        for leftover in output_dir.glob("_dl_*"):
            try:
                leftover.unlink()
            except OSError:
                pass

        if _is_deezer_url(url):
            from app.services.deezer import download_from_deezer_id, extract_track_id
            if not deezer_arl:
                raise RuntimeError("No Deezer ARL configured in Settings")
            track_id = extract_track_id(url)
            download_from_deezer_id(track_id, deezer_arl, mp3_path)
            if not (mp3_path.exists() and mp3_path.stat().st_size >= 10_000):
                mp3_path.unlink(missing_ok=True)
                raise RuntimeError("Deezer: downloaded file is empty")
            return mp3_path, {"source": "deezer", "bitrate_kbps": _mp3_bitrate_kbps(mp3_path)}

        if not _is_youtube_url(url):
            raise ValueError("Only Deezer or YouTube links are supported")

        import yt_dlp
        node_path = _find_node_path()

        def _ydl_opts(use_cookies: bool) -> dict:
            opts = _base_ydl_opts(
                outtmpl, node_path,
                use_cookies=use_cookies,
                youtube_cookies_path=youtube_cookies_path,
                youtube_browser=youtube_browser,
            )
            opts["noprogress"] = True
            return opts

        has_cookies = bool(youtube_browser or youtube_cookies_path)
        last_error: Exception | None = None
        for use_cookies in ([False, True] if has_cookies else [False]):
            if mp3_path.exists():
                mp3_path.unlink()
            try:
                with yt_dlp.YoutubeDL(_ydl_opts(use_cookies)) as ydl:
                    ydl.download([url])
                if mp3_path.exists() and mp3_path.stat().st_size >= 10_000:
                    return mp3_path, {"source": "youtube", "bitrate_kbps": _mp3_bitrate_kbps(mp3_path)}
                mp3_path.unlink(missing_ok=True)
                last_error = RuntimeError("downloaded file is empty")
            except Exception as e:
                last_error = e
                if "Sign in to confirm your age" not in str(e):
                    break

        mp3_path.unlink(missing_ok=True)
        raise RuntimeError(f"YouTube: {last_error}" if last_error else "YouTube download failed")

    return await asyncio.to_thread(_download)
