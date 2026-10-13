import logging
import os
import socket
import sys
import threading
import time
import urllib.request
from logging.handlers import RotatingFileHandler
from pathlib import Path

APP_NAME = "SpotiStorage"
PREFERRED_PORTS = range(8765, 8776)

FROZEN = getattr(sys, "frozen", False)
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
REPO_DIR = Path(__file__).resolve().parents[1]

if not FROZEN:
    sys.path.insert(0, str(REPO_DIR / "backend"))

import win32  # noqa: E402

logger = logging.getLogger("desktop")


def _default_config_dir() -> Path:
    if FROZEN:
        return Path(os.environ.get("APPDATA", Path.home())) / APP_NAME
    return REPO_DIR / "config"


def _icon_path() -> str:
    return str(BUNDLE_DIR / "icon.ico" if FROZEN else BUNDLE_DIR / "assets" / "icon.ico")


def _setup_logging(config_dir: Path) -> None:
    log_dir = config_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(log_dir / "app.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    handlers: list[logging.Handler] = [file_handler]
    if sys.stderr is None:
        sys.stdout = sys.stderr = file_handler.stream
    else:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", handlers=handlers)


def _find_free_port() -> int:
    for port in PREFERRED_PORTS:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port in {PREFERRED_PORTS.start}-{PREFERRED_PORTS.stop - 1}")


def _hide_child_consoles() -> None:
    import subprocess

    original_init = subprocess.Popen.__init__

    def init(self, *args, **kwargs):
        kwargs["creationflags"] = kwargs.get("creationflags", 0) | subprocess.CREATE_NO_WINDOW
        original_init(self, *args, **kwargs)

    subprocess.Popen.__init__ = init


def _configure_environment(config_dir: Path, port: int) -> None:
    os.environ["SPOTISTORAGE_CONFIG_DIR"] = str(config_dir)
    os.environ["SPOTISTORAGE_PLATFORM"] = "windows"
    os.environ["SPOTISTORAGE_PORT"] = str(port)
    if FROZEN:
        os.environ["SPOTISTORAGE_FFMPEG_DIR"] = str(Path(sys.executable).parent / "ffmpeg")
        os.environ["SPOTISTORAGE_QUICKJS_PATH"] = str(BUNDLE_DIR / "bin" / "qjs.exe")


def _start_server(port: int):
    import uvicorn
    from app.main import app

    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_config=None))
    thread = threading.Thread(target=server.run, name="uvicorn", daemon=True)
    thread.start()
    deadline = time.monotonic() + 60
    while not server.started:
        if not thread.is_alive() or time.monotonic() > deadline:
            raise RuntimeError("Backend server failed to start, see logs/app.log")
        time.sleep(0.05)
    return server, thread


def _stop_server(server, thread) -> None:
    server.should_exit = True
    thread.join(timeout=10)


def _get_json(url: str):
    import json
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def _self_test(base_url: str) -> int:
    health = _get_json(f"{base_url}/api/health")
    deps = _get_json(f"{base_url}/api/dependencies")
    with urllib.request.urlopen(base_url, timeout=30) as response:
        index_ok = b'id="root"' in response.read()
    logger.info("Self-test: health=%s deps=%s index=%s", health, deps, index_ok)
    return 0 if health.get("status") == "ok" and deps.get("all_ok") and index_ok else 1


def main() -> int:
    self_test = "--self-test" in sys.argv
    config_dir = Path(os.environ.get("SPOTISTORAGE_CONFIG_DIR") or _default_config_dir())
    _setup_logging(config_dir)

    if not self_test and not win32.acquire_single_instance(f"Local\\{APP_NAME}.SingleInstance"):
        win32.focus_window(APP_NAME)
        return 0

    if FROZEN:
        _hide_child_consoles()

    try:
        port = _find_free_port()
        _configure_environment(config_dir, port)
        server, thread = _start_server(port)
    except Exception as exc:
        logger.exception("Startup failed")
        if not self_test:
            win32.show_error(APP_NAME, f"{APP_NAME} could not start:\n{exc}")
        return 1

    base_url = f"http://127.0.0.1:{port}"
    try:
        if self_test:
            return _self_test(base_url)
        from shell import run_window
        return run_window(base_url, config_dir, _icon_path())
    except Exception:
        logger.exception("Desktop shell crashed")
        return 1
    finally:
        _stop_server(server, thread)


if __name__ == "__main__":
    sys.exit(main())
