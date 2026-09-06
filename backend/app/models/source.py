from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TrackStatus(str, Enum):
    downloaded = "downloaded"
    missing = "missing"
    removed_from_source = "removed_from_source"
    wrong_track = "wrong_track"


class TrackState(BaseModel):
    file: Optional[str] = None
    status: TrackStatus = TrackStatus.missing
    title: Optional[str] = None
    artist: Optional[str] = None
    position: Optional[int] = None
    expected_duration_s: Optional[float] = None
    source: Optional[str] = None
    bitrate_kbps: Optional[int] = None


class SourceType(str, Enum):
    playlist = "playlist"
    album = "album"
    track = "track"


class SpotifyJson(BaseModel):
    type: SourceType
    spotify_id: str
    spotify_url: str
    name: str
    artwork_url: Optional[str] = None
    last_refreshed: Optional[str] = None
    tracks: dict[str, TrackState] = {}
