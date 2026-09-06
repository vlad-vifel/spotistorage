from pydantic import BaseModel, Field
from typing import Optional
import uuid


class Library(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    root_path: str


class AppConfig(BaseModel):
    libraries: list[Library] = []
    active_library_id: Optional[str] = None
    setup_complete: bool = False
    sp_dc: Optional[str] = None
    youtube_cookies_path: Optional[str] = None
    youtube_browser: Optional[str] = None
    deezer_arl: Optional[str] = None
