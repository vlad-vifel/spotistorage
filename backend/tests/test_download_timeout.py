import asyncio
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

from app.models.download import DownloadJob, JobStatus
from app.services import download_queue as dq
from app.services.audio_engine import DownloadCancelled


class _FakeDb:
    async def execute(self, *args, **kwargs):
        return None

    async def commit(self):
        return None


def _make_queue(folder: Path) -> tuple[dq.DownloadQueue, DownloadJob]:
    queue = dq.DownloadQueue()
    job = DownloadJob(source_id="s", track_id="t", track_title="Song", track_artist="Artist")
    queue._jobs[job.id] = job
    queue._track_meta[job.id] = {"_folder": str(folder), "title": "Song", "artists": ["Artist"]}
    return queue, job


class TrackTimeoutTests(unittest.TestCase):
    def _run(self, fake_download, *, timeout: float, grace: float) -> tuple[DownloadJob, float, bool]:
        with tempfile.TemporaryDirectory() as temp_dir:
            queue, job = _make_queue(Path(temp_dir))
            with (
                mock.patch.object(dq, "_TRACK_TIMEOUT", timeout),
                mock.patch.object(dq, "_TIMEOUT_GRACE", grace),
                mock.patch.object(dq, "load_state", return_value=None),
                mock.patch("app.services.db.get_db", return_value=_FakeDb()),
                mock.patch.object(dq.audio_engine, "download_track", fake_download),
                mock.patch.object(queue, "_schedule_retry") as schedule_retry,
            ):
                async def timed() -> float:
                    started = time.monotonic()
                    await queue._process(job)
                    return time.monotonic() - started

                elapsed = asyncio.run(timed())
                retry_scheduled = schedule_retry.called
            return job, elapsed, retry_scheduled

    def test_cooperative_download_is_aborted_at_the_deadline(self) -> None:
        async def fake(*args, should_cancel, **kwargs):
            while not should_cancel():
                await asyncio.sleep(0.02)
            raise DownloadCancelled()

        job, elapsed, retry_scheduled = self._run(fake, timeout=0.2, grace=5)

        self.assertLess(elapsed, 2)
        self.assertEqual(job.status, JobStatus.queued)
        self.assertTrue(retry_scheduled)
        self.assertEqual(job.retry_count, 1)

    def test_blocked_download_is_abandoned_after_the_grace_period(self) -> None:
        release = threading.Event()

        async def fake(*args, **kwargs):
            await asyncio.to_thread(release.wait, 5)
            raise RuntimeError("never reached")

        try:
            job, elapsed, retry_scheduled = self._run(fake, timeout=0.1, grace=0.2)
        finally:
            release.set()

        self.assertLess(elapsed, 2)
        self.assertEqual(job.status, JobStatus.queued)
        self.assertTrue(retry_scheduled)

    def test_timeout_fails_the_track_after_the_last_retry(self) -> None:
        async def fake(*args, should_cancel, **kwargs):
            while not should_cancel():
                await asyncio.sleep(0.02)
            raise DownloadCancelled()

        with tempfile.TemporaryDirectory() as temp_dir:
            queue, job = _make_queue(Path(temp_dir))
            job.retry_count = dq._MAX_AUTO_RETRIES - 1
            with (
                mock.patch.object(dq, "_TRACK_TIMEOUT", 0.1),
                mock.patch.object(dq, "load_state", return_value=None),
                mock.patch("app.services.db.get_db", return_value=_FakeDb()),
                mock.patch.object(dq.audio_engine, "download_track", fake),
            ):
                asyncio.run(queue._process(job))

        self.assertEqual(job.status, JobStatus.failed)
        self.assertIn("Timed out", job.error)


if __name__ == "__main__":
    unittest.main()
