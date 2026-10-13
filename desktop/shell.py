import logging
import threading
from pathlib import Path

import webview

import win32
from tray import Tray
from zoom import ZOOM_SCRIPT, Zoom

APP_NAME = "SpotiStorage"
WINDOW_BACKGROUND = "#18181b"
WINDOW_FRAME_RGB = 0x18181B

logger = logging.getLogger("desktop")


def fit_maximized_to_work_area(form) -> None:
    from System import Action
    from System.Drawing import Rectangle

    x, y, width, height = win32.maximized_bounds(form.Handle.ToInt64())
    form.Invoke(Action(lambda: setattr(form, "MaximizedBounds", Rectangle(x, y, width, height))))


class DesktopApi:
    def __init__(self):
        self._window = None
        self._zoom = None

    def pick_folder(self):
        result = self._window.create_file_dialog(webview.FileDialog.FOLDER)
        return result[0] if result else None

    def pick_file(self):
        result = self._window.create_file_dialog(
            webview.FileDialog.OPEN, file_types=("Text files (*.txt)", "All files (*.*)"),
        )
        return result[0] if result else None

    def zoom(self, action):
        self._zoom.apply(self._window.native, action)

    def _hwnd(self) -> int:
        return self._window.native.Handle.ToInt64()

    def window_minimize(self):
        win32.minimize(self._hwnd())

    def window_toggle_maximize(self):
        hwnd = self._hwnd()
        if win32.is_maximized(hwnd):
            win32.restore(hwnd)
        else:
            fit_maximized_to_work_area(self._window.native)
            win32.maximize(hwnd)
        return win32.is_maximized(hwnd)

    def window_close(self):
        win32.request_close(self._hwnd())

    def window_is_maximized(self):
        return win32.is_maximized(self._hwnd())

    def window_start_drag(self):
        from System import Action

        hwnd = self._hwnd()
        self._window.native.BeginInvoke(Action(lambda: win32.begin_move(hwnd)))

    def window_start_resize(self, edge):
        from System import Action

        hwnd = self._hwnd()
        self._window.native.BeginInvoke(Action(lambda: win32.begin_resize(hwnd, edge)))


def _summary():
    from app.services.download_queue import download_queue
    for _ in range(3):
        try:
            return download_queue.summary(), download_queue.has_active_work()
        except RuntimeError:
            continue
    return None, False


def _close_action() -> str:
    from app.services.config_store import load_config
    try:
        return load_config().close_action
    except Exception:
        logger.exception("Could not read close_action")
        return "quit"


def _status_text(summary, active: bool) -> str:
    if not active or summary is None:
        return "No active downloads"
    if summary.preparing and not summary.total:
        return "Preparing downloads…"
    return f"Downloading {summary.done}/{summary.total}"


def _batch_text(summary) -> str:
    parts = [f"Downloaded {summary.done}"]
    if summary.failed:
        parts.append(f"{summary.failed} failed")
    if summary.cancelled:
        parts.append(f"{summary.cancelled} cancelled")
    return " · ".join(parts)


class DesktopShell:
    def __init__(self, base_url: str, config_dir: Path, icon_path: str):
        self._quitting = False
        self._hidden = False
        self._stop = threading.Event()
        self._api = DesktopApi()
        self._zoom = Zoom(config_dir / "window.json")
        self.window = webview.create_window(
            APP_NAME, base_url, js_api=self._api, width=1280, height=820, min_size=(420, 600),
            background_color=WINDOW_BACKGROUND, text_select=True, maximized=True,
        )
        self._api._window = self.window
        self._api._zoom = self._zoom
        self.window.events.closing += self._on_closing
        self.window.events.before_show += self._on_before_show
        self.window.events.loaded += self._on_loaded
        self.tray = Tray(icon_path, on_open=self.show, on_quit=self.quit)

    def _on_before_show(self) -> None:
        try:
            hwnd = self.window.native.Handle.ToInt64()
            win32.remove_title_bar(hwnd, WINDOW_FRAME_RGB)
            fit_maximized_to_work_area(self.window.native)
            if not win32.is_maximized(hwnd):
                win32.maximize(hwnd)
        except Exception:
            logger.exception("Could not remove the native title bar")

    def _on_loaded(self) -> None:
        self.window.run_js(ZOOM_SCRIPT)

    def _confirm_quit(self) -> bool:
        summary, active = _summary()
        if not active:
            return True
        progress = f" ({summary.done} of {summary.total})" if summary and summary.total else ""
        return win32.confirm(
            APP_NAME,
            f"Downloads are still in progress{progress}.\n\n"
            "Quit anyway? Unfinished tracks will be marked as failed and can be retried later.",
        )

    def _on_closing(self) -> bool:
        if self._quitting:
            return True
        if _close_action() == "tray":
            self._hidden = True
            self.tray.set_visible(True)
            threading.Thread(target=self.window.hide, daemon=True).start()
            return False
        if not self._confirm_quit():
            return False
        self._quitting = True
        return True

    def show(self) -> None:
        self._hidden = False
        self.window.show()
        win32.bring_to_front(self.window.native.Handle.ToInt64())

    def quit(self) -> None:
        if self._quitting:
            return
        if not self._confirm_quit():
            return
        self._quitting = True
        self.window.destroy()

    def watch_downloads(self) -> None:
        was_active = False
        while not self._stop.wait(3):
            summary, active = _summary()
            self.tray.set_visible(self._hidden or _close_action() == "tray")
            self.tray.set_status(_status_text(summary, active))
            if was_active and not active and self._hidden and summary and summary.total:
                self.tray.notify(_batch_text(summary))
            was_active = active

    def stop(self) -> None:
        self._stop.set()
        self.tray.stop()


def run_window(base_url: str, config_dir: Path, icon_path: str) -> int:
    shell = DesktopShell(base_url, config_dir, icon_path)
    threading.Thread(target=shell.watch_downloads, name="tray-status", daemon=True).start()
    try:
        webview.start(
            gui="edgechromium", private_mode=False, storage_path=str(config_dir / "webview"), icon=icon_path,
        )
    except Exception as exc:
        logger.exception("WebView failed")
        win32.show_error(
            APP_NAME,
            f"{APP_NAME} needs the Microsoft Edge WebView2 Runtime.\n\n"
            f"Install it from https://developer.microsoft.com/microsoft-edge/webview2/ and start {APP_NAME} again.\n\n"
            f"Details: {exc}",
        )
        return 1
    finally:
        shell.stop()
    return 0
