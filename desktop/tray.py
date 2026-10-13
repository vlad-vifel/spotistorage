import threading
from typing import Callable

import pystray
from PIL import Image


class Tray:
    def __init__(self, icon_path: str, on_open: Callable[[], None], on_quit: Callable[[], None]):
        self._status = "No active downloads"
        self._icon = pystray.Icon(
            "SpotiStorage",
            Image.open(icon_path),
            "SpotiStorage",
            menu=pystray.Menu(
                pystray.MenuItem("Open SpotiStorage", lambda: on_open(), default=True),
                pystray.MenuItem(lambda _: self._status, None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Quit", lambda: threading.Thread(target=on_quit, daemon=True).start()),
            ),
        )
        self._icon.run_detached()

    def set_visible(self, visible: bool) -> None:
        if self._icon.visible != visible:
            self._icon.visible = visible

    def set_status(self, status: str) -> None:
        if status != self._status:
            self._status = status
            self._icon.title = f"SpotiStorage – {status}"
            self._icon.update_menu()

    def notify(self, message: str) -> None:
        if self._icon.visible:
            self._icon.notify(message, "SpotiStorage")

    def stop(self) -> None:
        self._icon.stop()
