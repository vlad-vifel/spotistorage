import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.atomic_write import write_text_atomic
from app.core.compat import model_copy, model_dump
from app.core.paths import config_dir
from app.models.config import AppConfig, AppConfigResponse
from app.services.config_store import load_config, save_config

router = APIRouter(prefix="/api/config", tags=["config"])


def _read_youtube_cookies(path: str | None) -> str | None:
    if not path:
        return None
    try:
        return Path(path).read_text(encoding="utf-8")
    except OSError:
        return None


def _enrich(cfg: AppConfig) -> AppConfigResponse:
    return AppConfigResponse(
        **model_dump(cfg),
        platform=os.environ.get("SPOTISTORAGE_PLATFORM", "desktop"),
        youtube_cookies_content=_read_youtube_cookies(cfg.youtube_cookies_path),
    )


@router.get("", response_model=AppConfigResponse)
def get_config():
    return _enrich(load_config())


@router.put("", response_model=AppConfigResponse)
def update_config(body: AppConfig):
    save_config(body)
    return _enrich(load_config())


@router.put("/complete-setup")
def complete_setup():
    cfg = load_config()
    cfg = model_copy(cfg, {"setup_complete": True})
    save_config(cfg)
    return {"ok": True}


class SpDcRequest(BaseModel):
    sp_dc: str | None = None


@router.put("/sp-dc")
def update_sp_dc(body: SpDcRequest):
    cfg = load_config()
    value = body.sp_dc.strip() if body.sp_dc else None
    cfg = model_copy(cfg, {"sp_dc": value or None})
    save_config(cfg)
    return {"ok": True}


class YoutubeCookiesRequest(BaseModel):
    youtube_cookies_path: str | None = None
    youtube_browser: str | None = None
    youtube_cookies_text: str | None = None


@router.put("/youtube-cookies")
def update_youtube_cookies(body: YoutubeCookiesRequest):
    cfg = load_config()
    if body.youtube_cookies_text and body.youtube_cookies_text.strip():
        cookies_path = config_dir() / "youtube_cookies.txt"
        write_text_atomic(cookies_path, body.youtube_cookies_text)
        cfg = model_copy(cfg, {
            "youtube_cookies_path": str(cookies_path),
            "youtube_browser": None,
        })
    else:
        cfg = model_copy(cfg, {
            "youtube_cookies_path": body.youtube_cookies_path or None,
            "youtube_browser": body.youtube_browser or None,
        })
    save_config(cfg)
    return {"ok": True}


class DeezerArlRequest(BaseModel):
    deezer_arl: str | None = None


@router.put("/deezer-arl")
def update_deezer_arl(body: DeezerArlRequest):
    cfg = load_config()
    value = body.deezer_arl.strip() if body.deezer_arl else None
    cfg = model_copy(cfg, {"deezer_arl": value or None})
    save_config(cfg)
    return {"ok": True}


@router.get("/browse-folder")
def browse_folder():
    if os.environ.get("SPOTISTORAGE_PLATFORM") == "android":
        raise HTTPException(status_code=400, detail="Not available on Android — use the folder picker instead")
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        path = filedialog.askdirectory()
        root.destroy()
        return {"path": path or ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/browse-file")
def browse_file():
    if os.environ.get("SPOTISTORAGE_PLATFORM") == "android":
        raise HTTPException(status_code=400, detail="Not available on Android — paste the file's content instead")
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        path = filedialog.askopenfilename(filetypes=[("Text files", "*.txt"), ("All files", "*.*")])
        root.destroy()
        return {"path": path or ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
