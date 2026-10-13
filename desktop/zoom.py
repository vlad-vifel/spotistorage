import json
import logging
from pathlib import Path

logger = logging.getLogger("desktop")

LEVELS = (0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0)

ZOOM_SCRIPT = """
if (!window.__spotistorageZoom) {
  window.__spotistorageZoom = true;
  const zoom = (action) => window.pywebview?.api?.zoom?.(action);
  if (window.pywebview?.api?.zoom) zoom("restore");
  else window.addEventListener("pywebviewready", () => zoom("restore"), { once: true });
  window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const action = { "=": "in", "+": "in", "-": "out", "_": "out", "0": "reset" }[e.key];
    if (!action) return;
    e.preventDefault();
    zoom(action);
  }, true);
  let lastWheel = 0;
  window.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.timeStamp - lastWheel < 120 || e.deltaY === 0) return;
    lastWheel = e.timeStamp;
    zoom(e.deltaY < 0 ? "in" : "out");
  }, { passive: false, capture: true });
}
"""


class Zoom:
    def __init__(self, state_file: Path):
        self._state_file = state_file
        self.factor = self._load()

    def _load(self) -> float:
        try:
            value = float(json.loads(self._state_file.read_text(encoding="utf-8"))["zoom"])
            return min(max(value, LEVELS[0]), LEVELS[-1])
        except (OSError, ValueError, KeyError, TypeError):
            return 1.0

    def _save(self) -> None:
        try:
            self._state_file.write_text(json.dumps({"zoom": self.factor}), encoding="utf-8")
        except OSError:
            logger.exception("Could not save zoom level")

    def _target(self, action: str) -> float:
        if action == "restore":
            return self.factor
        if action == "reset":
            return 1.0
        if action == "in":
            return next((level for level in LEVELS if level > self.factor + 0.001), LEVELS[-1])
        return next((level for level in reversed(LEVELS) if level < self.factor - 0.001), LEVELS[0])

    def apply(self, form, action: str) -> None:
        from System import Action

        target = self._target(action)

        def set_factor():
            form.webview.ZoomFactor = target

        form.Invoke(Action(set_factor))
        if target != self.factor:
            self.factor = target
            self._save()
