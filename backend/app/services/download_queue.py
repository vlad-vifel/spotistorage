import asyncio
import json
import os
from pathlib import Path
from typing import Optional
from app.models.download import DownloadJob, JobStatus
from app.models.source import TrackStatus, TrackState
from app.services import audio_engine
from app.services import metadata as meta_svc
from app.services.state_store import load_state, save_state
from app.services.filenames import track_filename, standalone_filename
from app.services.config_store import load_config
from app.core.state_locks import get_state_lock

_CONCURRENCY = 1
_MAX_AUTO_RETRIES = 5
_DELAY_BETWEEN_DOWNLOADS = 1.0
_BACKOFF_BASE = 2.0
_BACKOFF_MAX = 60.0


class DownloadQueue:
    def __init__(self):
        self._jobs: dict[str, DownloadJob] = {}
        self._track_meta: dict[str, dict] = {}
        self._manual_urls: dict[str, str] = {}
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._workers: list[asyncio.Task] = []
        self._cancelled: set[str] = set()

    async def start(self) -> None:
        from app.services.db import get_db
        db = get_db()

        await db.execute(
            "UPDATE download_jobs SET status='failed', error='Interrupted by server restart' WHERE status='downloading'"
        )
        await db.execute("DELETE FROM download_jobs WHERE status='queued'")
        await db.commit()

        async with db.execute(
            "SELECT * FROM download_jobs WHERE status='failed' ORDER BY rowid"
        ) as cur:
            rows = await cur.fetchall()

        for row in rows:
            track_data = json.loads(row["track_meta"])
            track_data["_folder"] = row["folder_path"]
            job = DownloadJob(
                id=row["id"],
                source_id=row["source_id"],
                track_id=row["track_id"],
                track_title=row["track_title"] or "",
                track_artist=row["track_artist"] or "",
                status=JobStatus.failed,
                progress=0.0,
                error=row["error"],
                retry_count=row["retry_count"] or 0,
            )
            self._jobs[job.id] = job
            self._track_meta[job.id] = track_data

        for _ in range(_CONCURRENCY):
            self._workers.append(asyncio.create_task(self._worker()))

    async def clear_done_if_idle(self) -> None:
        active = any(
            j.status in (JobStatus.queued, JobStatus.downloading)
            for j in self._jobs.values()
        )
        if active:
            return
        from app.services.db import get_db
        await get_db().execute("DELETE FROM download_jobs WHERE status IN ('done', 'failed')")
        await get_db().commit()
        clear_ids = [jid for jid, j in self._jobs.items() if j.status in (JobStatus.done, JobStatus.failed)]
        for jid in clear_ids:
            self._jobs.pop(jid, None)
            self._track_meta.pop(jid, None)
            self._manual_urls.pop(jid, None)
            self._cancelled.discard(jid)

    async def enqueue_source(self, source_id: str, folder: Path, tracks: list[dict]) -> list[DownloadJob]:
        await self.clear_done_if_idle()
        from app.services.db import get_db
        db = get_db()

        # Clear previous failures for this source so Errors page starts fresh
        stale_ids = [jid for jid, j in self._jobs.items()
                     if j.source_id == source_id and j.status == JobStatus.failed]
        for jid in stale_ids:
            self._jobs.pop(jid, None)
            self._track_meta.pop(jid, None)
            self._manual_urls.pop(jid, None)
            self._cancelled.discard(jid)
        if stale_ids:
            await db.execute(
                "DELETE FROM download_jobs WHERE status='failed' AND source_id=?", (source_id,)
            )
            await db.commit()

        in_progress_ids = {
            j.track_id for j in self._jobs.values()
            if j.source_id == source_id and j.status in (JobStatus.queued, JobStatus.downloading)
        }

        ordered = sorted(tracks, key=lambda t: t.get("track_number") or 9999)

        jobs = []
        for track in ordered:
            if track["id"] in in_progress_ids:
                continue

            job = DownloadJob(
                source_id=source_id,
                track_id=track["id"],
                track_title=track.get("title", ""),
                track_artist=", ".join(track.get("artists", [])),
            )
            self._jobs[job.id] = job
            track_data = dict(track)
            track_data["_folder"] = str(folder)
            self._track_meta[job.id] = track_data

            await db.execute(
                """INSERT INTO download_jobs
                   (id, source_id, track_id, track_title, track_artist, track_meta, folder_path, position, retry_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                (
                    job.id,
                    source_id,
                    track["id"],
                    track.get("title", ""),
                    ", ".join(track.get("artists", [])),
                    json.dumps(track),
                    str(folder),
                    track.get("track_number") or 0,
                ),
            )
            self._queue.put_nowait(job.id)
            jobs.append(job)

        await db.commit()
        return jobs

    async def enqueue_retry(self, job_id: str) -> Optional[DownloadJob]:
        job = self._jobs.get(job_id)
        if not job or job.status != JobStatus.failed:
            return None
        self._cancelled.discard(job_id)
        self._manual_urls.pop(job_id, None)
        job.status = JobStatus.queued
        job.error = None
        job.retry_count = 0
        from app.services.db import get_db
        await get_db().execute(
            "UPDATE download_jobs SET status='queued', error=NULL, retry_count=0 WHERE id=?",
            (job_id,),
        )
        await get_db().commit()
        self._queue.put_nowait(job_id)
        return job

    async def enqueue_manual_url_retry(self, job_id: str, url: str) -> Optional[DownloadJob]:
        job = self._jobs.get(job_id)
        if not job or job.status != JobStatus.failed:
            return None
        self._cancelled.discard(job_id)
        self._manual_urls[job_id] = url
        job.status = JobStatus.queued
        job.error = None
        job.retry_count = 0
        from app.services.db import get_db
        await get_db().execute(
            "UPDATE download_jobs SET status='queued', error=NULL, retry_count=0 WHERE id=?",
            (job_id,),
        )
        await get_db().commit()
        self._queue.put_nowait(job_id)
        return job

    def list_jobs(self) -> list[DownloadJob]:
        return list(self._jobs.values())

    def count_active(self) -> int:
        return sum(
            1 for j in self._jobs.values()
            if j.status in (JobStatus.queued, JobStatus.downloading)
        )

    def get_track_job_statuses(self, source_id: str) -> dict[str, str]:
        return {
            j.track_id: j.status.value
            for j in self._jobs.values()
            if j.source_id == source_id and j.status != JobStatus.done
        }

    def get_in_progress_track_ids(self, source_id: str) -> set[str]:
        return {
            j.track_id
            for j in self._jobs.values()
            if j.source_id == source_id and j.status in (JobStatus.queued, JobStatus.downloading)
        }

    async def remove_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job:
            return False
        if job.status in (JobStatus.queued, JobStatus.downloading):
            await self.cancel_job(job_id)
        else:
            await self.clear_job(job_id)
        return True

    async def cancel_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job or job.status not in (JobStatus.queued, JobStatus.downloading):
            return False
        self._cancelled.add(job_id)
        await self._update_status(job, JobStatus.failed, "Cancelled")
        return True

    async def clear_job(self, job_id: str) -> bool:
        job = self._jobs.pop(job_id, None)
        if not job:
            return False
        self._track_meta.pop(job_id, None)
        self._cancelled.discard(job_id)
        from app.services.db import get_db
        await get_db().execute("DELETE FROM download_jobs WHERE id=?", (job_id,))
        await get_db().commit()
        return True

    async def clear_all_failed(self) -> int:
        failed_ids = [jid for jid, j in self._jobs.items() if j.status == JobStatus.failed]
        for jid in failed_ids:
            self._jobs.pop(jid, None)
            self._track_meta.pop(jid, None)
            self._manual_urls.pop(jid, None)
            self._cancelled.discard(jid)
        from app.services.db import get_db
        await get_db().execute("DELETE FROM download_jobs WHERE status='failed'")
        await get_db().commit()
        return len(failed_ids)

    async def cancel_all_active(self) -> int:
        active = [j for j in self._jobs.values() if j.status in (JobStatus.queued, JobStatus.downloading)]
        if not active:
            return 0
        for job in active:
            self._cancelled.add(job.id)
            job.status = JobStatus.failed
            job.error = "Cancelled"
            job.progress = 0.0
        ids = [j.id for j in active]
        placeholders = ",".join("?" * len(ids))
        from app.services.db import get_db
        await get_db().execute(
            f"UPDATE download_jobs SET status='failed', error='Cancelled', progress=0 WHERE id IN ({placeholders})",
            ids,
        )
        await get_db().commit()
        return len(active)

    async def _update_status(
        self,
        job: DownloadJob,
        status: JobStatus,
        error: str | None = None,
        progress: float | None = None,
    ) -> None:
        job.status = status
        if error is not None:
            job.error = error
        if progress is not None:
            job.progress = progress
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
                await self._process(job)
                await asyncio.sleep(_DELAY_BETWEEN_DOWNLOADS)
            self._queue.task_done()

    async def _process(self, job: DownloadJob) -> None:
        await self._update_status(job, JobStatus.downloading)
        track = self._track_meta.get(job.id)
        if not track:
            await self._update_status(job, JobStatus.failed, "Missing track metadata")
            return

        folder = Path(track.get("_folder", ""))
        if not folder.exists():
            await self._update_status(job, JobStatus.failed, "Source folder not found")
            return

        try:
            initial_state = load_state(folder)
            source_type = initial_state.type.value if initial_state else "track"
            position = track.get("track_number", 1) or 1
            artists = track.get("artists", ["Unknown"])

            if source_type in ("playlist", "album"):
                final_name = track_filename(position, artists, track["title"])
            else:
                final_name = standalone_filename(artists, track["title"])

            final_path = folder / final_name
            artist_str = ", ".join(artists) if artists else ""

            def on_progress(pct: float) -> None:
                job.progress = pct

            cfg = load_config()
            duration_ms = track.get("duration_ms")
            manual_url = self._manual_urls.get(job.id)
            if manual_url:
                downloaded, dl_info = await audio_engine.download_from_url(
                    manual_url, folder,
                    youtube_cookies_path=cfg.youtube_cookies_path,
                    youtube_browser=cfg.youtube_browser,
                    deezer_arl=cfg.deezer_arl,
                )
            else:
                downloaded, dl_info = await audio_engine.download_track(
                    job.track_id, folder,
                    artist=artist_str,
                    title=track["title"],
                    youtube_cookies_path=cfg.youtube_cookies_path,
                    youtube_browser=cfg.youtube_browser,
                    deezer_arl=cfg.deezer_arl,
                    expected_duration_s=duration_ms / 1000 if duration_ms else None,
                    on_progress=on_progress,
                )

            if not downloaded.exists() or downloaded.stat().st_size < 4096:
                raise RuntimeError("Downloaded file is empty or missing")

            if job.id in self._cancelled:
                downloaded.unlink(missing_ok=True)
                return

            job.progress = 0.95
            await asyncio.to_thread(
                meta_svc.embed_metadata,
                downloaded,
                track["title"],
                artists,
                track.get("album", ""),
                track.get("album_artist", ""),
                position,
                track.get("disc_number", 1) or 1,
                str(track.get("year", "")),
                track.get("artwork_url"),
            )

            if downloaded != final_path:
                os.replace(downloaded, final_path)

            async with get_state_lock(folder):
                fresh_state = load_state(folder)
                if fresh_state:
                    duration_ms = track.get("duration_ms")
                    fresh_state.tracks[job.track_id] = TrackState(
                        file=final_name,
                        status=TrackStatus.downloaded,
                        title=track.get("title"),
                        artist=", ".join(artists),
                        position=position,
                        expected_duration_s=duration_ms / 1000 if duration_ms else None,
                        source=dl_info.get("source"),
                        bitrate_kbps=dl_info.get("bitrate_kbps"),
                    )
                    save_state(folder, fresh_state)

            job.retry_count = 0
            self._manual_urls.pop(job.id, None)
            await self._update_status(job, JobStatus.done, progress=1.0)

        except Exception as exc:
            if job.id in self._cancelled:
                return
            err_str = str(exc)
            permanent = "Duration mismatch" in err_str or "did not find the track" in err_str or "DRM protected" in err_str
            job.retry_count += 1
            if not permanent and job.retry_count < _MAX_AUTO_RETRIES:
                job.status = JobStatus.queued
                job.error = None
                job.progress = 0.0
                await self._update_status(job, JobStatus.queued)
                self._schedule_retry(job)
            else:
                await self._update_status(job, JobStatus.failed, err_str[:300])

    def _schedule_retry(self, job: DownloadJob) -> None:
        if job.id in self._cancelled:
            return
        delay = min(_BACKOFF_BASE ** job.retry_count, _BACKOFF_MAX)

        async def _delayed() -> None:
            if job.id in self._cancelled:
                return
            await asyncio.sleep(delay)
            if job.id not in self._cancelled:
                self._queue.put_nowait(job.id)

        asyncio.create_task(_delayed())


download_queue = DownloadQueue()
