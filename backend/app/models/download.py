from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import uuid


class JobStatus(str, Enum):
    queued = "queued"
    downloading = "downloading"
    done = "done"
    failed = "failed"
    cancelled = "cancelled"


class DownloadJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str
    track_id: str
    track_title: str
    track_artist: str
    status: JobStatus = JobStatus.queued
    progress: float = 0.0
    error: Optional[str] = None
    retry_count: int = 0


class DownloadSummary(BaseModel):
    batch_id: str | None = None
    active: bool = False
    preparing: bool = False
    total: int = 0
    done: int = 0
    failed: int = 0
    cancelled: int = 0
    percent: float = 0.0
    current_track: str | None = None
