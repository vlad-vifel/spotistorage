import asyncio
import json
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.core.state_locks import get_state_lock
from app.models.download import DownloadJob, DownloadSummary, JobStatus
from app.models.source import TrackState, TrackStatus
from app.services import audio_engine
from app.services import metadata as meta_svc
from app.services.config_store import load_config
from app.services.filenames import standalone_filename, track_filename
from app.services.state_store import load_state, save_state

_CONCURRENCY = 1
_MAX_AUTO_RETRIES = 3
_DELAY_BETWEEN_DOWNLOADS = 1.0
_BACKOFF_BASE = 2.0
_BACKOFF_MAX = 60.0


@dataclass
class _Batch:
    id: str
    planned_total: int = 0
    preparing: bool = False
    job_ids: set[str] = field(default_factory=set)
    statuses: dict[str, JobStatus] = field(default_factory=dict)
    preparation_failed: int = 0
    preparation_cancelled: int = 0
    cancelled: bool = False


class DownloadQueue:
    def __init__(self):
        self._jobs: dict[str, DownloadJob] = {}
        self._track_meta: dict[str, dict] = {}
        self._manual_urls: dict[str, str] = {}
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._workers: list[asyncio.Task] = []
        self._cancelled: set[str] = set()
        self._processing: set[str] = set()
        self._batch: _Batch | None = None
        self._job_batches: dict[str, str] = {}

    async def start(self) -> None:
        from app.services.db import get_db

        db = get_db()
        await db.execute(
            "UPDATE download_jobs SET status='failed', error='Interrupted by server restart' WHERE status='downloading'"
        )
        await db.execute("DELETE FROM download_jobs WHERE status='queued'")
        await db.commit()
        async with db.execute("SELECT * FROM download_jobs WHERE status='failed' ORDER BY rowid") as cur:
            rows = await cur.fetchall()
        for row in rows:
            track_data = json.loads(row["track_meta"])
            track_data["_folder"] = row["folder_path"]
            job = DownloadJob(
                id=row["id"], source_id=row["source_id"], track_id=row["track_id"],
                track_title=row["track_title"] or "", track_artist=row["track_artist"] or "",
                status=JobStatus.failed, error=row["error"], retry_count=row["retry_count"] or 0,
            )
            self._jobs[job.id] = job
            self._track_meta[job.id] = track_data
        self._workers = [asyncio.create_task(self._worker()) for _ in range(_CONCURRENCY)]

    async def begin_batch(
        self, planned_total: int = 0, *, preparing: bool = False, clear_history: bool = True
    ) -> str:
        if clear_history and not self.has_active_work():
            await self.clear_done_if_idle()
        if not self._batch or not self.summary().active:
            self._batch = _Batch(id=str(uuid.uuid4()), planned_total=planned_total, preparing=preparing)
        return self._batch.id

    def set_batch_preparing(self, batch_id: str, preparing: bool) -> None:
        if self._batch and self._batch.id == batch_id:
            self._batch.preparing = preparing

    def mark_preparation_failed(self, batch_id: str, count: int) -> None:
        if self._batch and self._batch.id == batch_id:
            self._batch.preparation_failed += count

    def is_batch_open(self, batch_id: str) -> bool:
        return bool(self._batch and self._batch.id == batch_id and not self._batch.cancelled)

    def has_active_work(self) -> bool:
        return any(job.status in (JobStatus.queued, JobStatus.downloading) for job in self._jobs.values()) or bool(self._processing)

    async def clear_done_if_idle(self) -> None:
        if self.has_active_work():
            return
        from app.services.db import get_db

        await get_db().execute("DELETE FROM download_jobs WHERE status IN ('done', 'failed', 'cancelled')")
        await get_db().commit()
        clear_ids = [
            job_id for job_id, job in self._jobs.items()
            if job.status in (JobStatus.done, JobStatus.failed, JobStatus.cancelled)
        ]
        for job_id in clear_ids:
            self._forget_job(job_id)

    async def enqueue_source(
        self, source_id: str, folder: Path, tracks: list[dict], *, batch_id: str | None = None
    ) -> list[DownloadJob]:
        if batch_id is None:
            batch_id = await self.begin_batch(len(tracks))
        elif not self.is_batch_open(batch_id):
            raise ValueError("Unknown download batch")
        from app.services.db import get_db

        db = get_db()
        in_progress = {
            job.track_id for job in self._jobs.values()
            if job.source_id == source_id and job.status in (JobStatus.queued, JobStatus.downloading)
        }
        jobs: list[DownloadJob] = []
        for track in sorted(tracks, key=lambda item: item.get("track_number") or 9999):
            if track["id"] in in_progress:
                continue
            job = DownloadJob(
                source_id=source_id,
                track_id=track["id"],
                track_title=track.get("title", ""),
                track_artist=", ".join(track.get("artists", [])),
            )
            self._jobs[job.id] = job
            self._track_meta[job.id] = {**track, "_folder": str(folder)}
            self._job_batches[job.id] = batch_id
            self._record_batch_status(job.id, JobStatus.queued)
            await db.execute(
                """INSERT INTO download_jobs
                   (id, source_id, track_id, track_title, track_artist, track_meta, folder_path, position, retry_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                (job.id, source_id, track["id"], track.get("title", ""), ", ".join(track.get("artists", [])),
                 json.dumps(track), str(folder), track.get("track_number") or 0),
            )
            self._queue.put_nowait(job.id)
            jobs.append(job)
        await db.commit()
        return jobs

    async def enqueue_retry(self, job_id: str, manual_url: str | None = None) -> DownloadJob | None:
        job = self._jobs.get(job_id)
        if not job or job.status != JobStatus.failed:
            return None
        batch_id = await self.begin_batch(1, clear_history=False)
        self._job_batches[job.id] = batch_id
        self._cancelled.discard(job.id)
        if manual_url:
            self._manual_urls[job.id] = manual_url
        else:
            self._manual_urls.pop(job.id, None)
        job.retry_count = 0
        await self._update_status(job, JobStatus.queued, error=None, progress=0.0)
        self._queue.put_nowait(job.id)
        return job

    async def enqueue_manual_url_retry(self, job_id: str, url: str) -> DownloadJob | None:
        return await self.enqueue_retry(job_id, manual_url=url)

    def list_jobs(self) -> list[DownloadJob]:
        return list(self._jobs.values())

    def summary(self) -> DownloadSummary:
        batch = self._batch
        if not batch:
            return DownloadSummary()
        statuses = list(batch.statuses.values())
        done = sum(status == JobStatus.done for status in statuses)
        failed = sum(status == JobStatus.failed for status in statuses) + batch.preparation_failed
        cancelled = sum(status == JobStatus.cancelled for status in statuses) + batch.preparation_cancelled
        active_jobs = [
            self._jobs[job_id] for job_id, status in batch.statuses.items()
            if status == JobStatus.downloading and job_id in self._jobs
        ]
        queued = sum(status == JobStatus.queued for status in statuses)
        total = max(batch.planned_total, len(batch.job_ids))
        active = not batch.cancelled and (batch.preparing or queued > 0 or bool(active_jobs))
        progress = (done + sum(job.progress for job in active_jobs)) / total if total else 0.0
        return DownloadSummary(
            batch_id=batch.id, active=active, preparing=batch.preparing, total=total,
            done=done, failed=failed, cancelled=cancelled,
            percent=max(0.0, min(progress, 1.0)),
            current_track=active_jobs[0].track_title if active_jobs else None,
        )

    def get_track_job_statuses(self, source_id: str) -> dict[str, str]:
        return {
            job.track_id: job.status.value for job in self._jobs.values()
            if job.source_id == source_id and job.status not in (JobStatus.done, JobStatus.cancelled)
        }

    def get_in_progress_track_ids(self, source_id: str) -> set[str]:
        return {
            job.track_id for job in self._jobs.values()
            if job.source_id == source_id and job.status in (JobStatus.queued, JobStatus.downloading)
        }

    async def remove_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job:
            return False
        if job.status in (JobStatus.queued, JobStatus.downloading):
            return await self.cancel_job(job_id)
        return await self.clear_job(job_id)

    async def cancel_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job or job.status not in (JobStatus.queued, JobStatus.downloading):
            return False
        self._cancelled.add(job_id)
        await self._update_status(job, JobStatus.cancelled, error="Cancelled", progress=0.0)
        return True

    async def clear_job(self, job_id: str) -> bool:
        if job_id not in self._jobs or job_id in self._processing:
            return False
        self._forget_job(job_id)
        from app.services.db import get_db

        await get_db().execute("DELETE FROM download_jobs WHERE id=?", (job_id,))
        await get_db().commit()
        return True

    async def clear_all_failed(self) -> int:
        ids = [
            job_id for job_id, job in self._jobs.items()
            if job.status == JobStatus.failed and job_id not in self._processing
        ]
        for job_id in ids:
            self._forget_job(job_id)
        if ids:
            from app.services.db import get_db
            await get_db().execute("DELETE FROM download_jobs WHERE status='failed'")
            await get_db().commit()
        return len(ids)

    async def cancel_all_active(self) -> int:
        active_ids = [
            job.id for job in self._jobs.values()
            if job.status in (JobStatus.queued, JobStatus.downloading)
        ]
        for job_id in active_ids:
            await self.cancel_job(job_id)
        if self._batch and not self._batch.cancelled:
            self._batch.cancelled = True
            self._batch.preparing = False
            self._batch.preparation_cancelled += max(0, self._batch.planned_total - len(self._batch.job_ids))
        return len(active_ids)

    async def _update_status(
        self, job: DownloadJob, status: JobStatus, error: str | None = None, progress: float | None = None
    ) -> None:
        job.status = status
        job.error = error
        if progress is not None:
            job.progress = progress
        self._record_batch_status(job.id, status)
        from app.services.db import get_db

        await get_db().execute(
            "UPDATE download_jobs SET status=?, error=?, progress=?, retry_count=? WHERE id=?",
            (status.value, job.error, job.progress, job.retry_count, job.id),
        )
        await get_db().commit()

    async def _worker(self) -> None:
        while True:
            job_id = await self._queue.get()
            job = self._jobs.get(job_id)
            if job and job.status == JobStatus.queued:
                self._processing.add(job_id)
                try:
                    await self._process(job)
                finally:
                    self._processing.discard(job_id)
                await asyncio.sleep(_DELAY_BETWEEN_DOWNLOADS)
            self._queue.task_done()

    async def _process(self, job: DownloadJob) -> None:
        await self._update_status(job, JobStatus.downloading, error=None)
        track = self._track_meta.get(job.id)
        if not track:
            await self._update_status(job, JobStatus.failed, "Missing track metadata")
            return
        folder = Path(track.get("_folder", ""))
        if not folder.exists():
            await self._update_status(job, JobStatus.failed, "Source folder not found")
            return
        downloaded: Path | None = None
        try:
            state = load_state(folder)
            source_type = state.type.value if state else "track"
            position = track.get("track_number", 1) or 1
            artists = track.get("artists", ["Unknown"])
            final_name = track_filename(position, artists, track["title"]) if source_type in ("playlist", "album") else standalone_filename(artists, track["title"])
            final_path = folder / final_name
            cfg = load_config()
            kwargs = {
                "youtube_cookies_path": cfg.youtube_cookies_path,
                "youtube_browser": cfg.youtube_browser,
                "deezer_arl": cfg.deezer_arl,
                "should_cancel": lambda: job.id in self._cancelled,
            }
            duration_ms = track.get("duration_ms")
            if job.id in self._manual_urls:
                downloaded, dl_info = await audio_engine.download_from_url(self._manual_urls[job.id], folder, **kwargs)
            else:
                downloaded, dl_info = await audio_engine.download_track(
                    job.track_id, folder, artist=", ".join(artists), title=track["title"],
                    expected_duration_s=duration_ms / 1000 if duration_ms else None,
                    on_progress=lambda progress: setattr(job, "progress", progress), **kwargs,
                )
            if not downloaded.exists() or downloaded.stat().st_size < 4096:
                raise RuntimeError("Downloaded file is empty or missing")
            if job.id in self._cancelled:
                downloaded.unlink(missing_ok=True)
                return
            job.progress = 0.95
            await asyncio.to_thread(
                meta_svc.embed_metadata, downloaded, track["title"], artists, track.get("album", ""),
                track.get("album_artist", ""), position, track.get("disc_number", 1) or 1,
                str(track.get("year", "")), track.get("artwork_url"),
            )
            if job.id in self._cancelled:
                downloaded.unlink(missing_ok=True)
                return
            if downloaded != final_path:
                os.replace(downloaded, final_path)
            async with get_state_lock(folder):
                fresh_state = load_state(folder)
                if fresh_state:
                    fresh_state.tracks[job.track_id] = TrackState(
                        file=final_name, status=TrackStatus.downloaded, title=track.get("title"),
                        artist=", ".join(artists), position=position,
                        expected_duration_s=duration_ms / 1000 if duration_ms else None,
                        source=dl_info.get("source"), bitrate_kbps=dl_info.get("bitrate_kbps"),
                    )
                    save_state(folder, fresh_state)
            job.retry_count = 0
            self._manual_urls.pop(job.id, None)
            await self._update_status(job, JobStatus.done, progress=1.0)
        except audio_engine.DownloadCancelled:
            if downloaded:
                downloaded.unlink(missing_ok=True)
        except Exception as exc:
            if job.id in self._cancelled:
                if downloaded:
                    downloaded.unlink(missing_ok=True)
                return
            error = str(exc)
            permanent = any(value in error for value in ("Duration mismatch", "did not find the track", "DRM protected"))
            job.retry_count += 1
            if not permanent and job.retry_count < _MAX_AUTO_RETRIES:
                await self._update_status(job, JobStatus.queued, progress=0.0)
                self._schedule_retry(job)
            else:
                await self._update_status(job, JobStatus.failed, error[:300], progress=0.0)

    def _schedule_retry(self, job: DownloadJob) -> None:
        delay = min(_BACKOFF_BASE ** job.retry_count, _BACKOFF_MAX)

        async def delayed_retry() -> None:
            await asyncio.sleep(delay)
            if job.id not in self._cancelled and job.status == JobStatus.queued:
                self._queue.put_nowait(job.id)

        asyncio.create_task(delayed_retry())

    def _record_batch_status(self, job_id: str, status: JobStatus) -> None:
        if self._batch and self._job_batches.get(job_id) == self._batch.id:
            self._batch.job_ids.add(job_id)
            self._batch.statuses[job_id] = status

    def _forget_job(self, job_id: str) -> None:
        self._jobs.pop(job_id, None)
        self._track_meta.pop(job_id, None)
        self._manual_urls.pop(job_id, None)
        self._cancelled.discard(job_id)
        self._job_batches.pop(job_id, None)


download_queue = DownloadQueue()
