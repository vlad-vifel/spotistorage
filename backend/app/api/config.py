from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.config import AppConfig
from app.services.config_store import load_config, save_config, mask_secrets, restore_masked_secrets

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=AppConfig)
def get_config():
    return mask_secrets(load_config())


@router.put("", response_model=AppConfig)
def update_config(body: AppConfig):
    current = load_config()
    body = restore_masked_secrets(current, body)
    save_config(body)
    return mask_secrets(body)


class SpDcRequest(BaseModel):
    sp_dc: str | None = None


@router.put("/sp-dc")
def update_sp_dc(body: SpDcRequest):
    cfg = load_config()
    cfg = cfg.model_copy(update={"sp_dc": body.sp_dc or None})
    save_config(cfg)
    return {"ok": True}


class YoutubeCookiesRequest(BaseModel):
    youtube_cookies_path: str | None = None
    youtube_browser: str | None = None


@router.put("/youtube-cookies")
def update_youtube_cookies(body: YoutubeCookiesRequest):
    cfg = load_config()
    cfg = cfg.model_copy(update={
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
    cfg = cfg.model_copy(update={"deezer_arl": body.deezer_arl or None})
    save_config(cfg)
    return {"ok": True}


@router.get("/browse-folder")
def browse_folder():
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
