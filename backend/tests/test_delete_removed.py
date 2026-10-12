import asyncio
import tempfile
import unittest
from pathlib import Path

from app.api.sources import _delete_removed_tracks
from app.models.source import SourceType, SpotifyJson, TrackState, TrackStatus
from app.services.state_store import load_state, save_state


class DeleteRemovedTracksTests(unittest.TestCase):
    def test_deletes_only_removed_from_source_tracks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            folder = Path(temp_dir)
            (folder / "001 - A - Kept.mp3").write_bytes(b"kept")
            (folder / "002 - A - Gone.mp3").write_bytes(b"gone")
            save_state(folder, SpotifyJson(
                type=SourceType.playlist, spotify_id="playlist", spotify_url="https://example.test",
                name="Playlist", tracks={
                    "kept": TrackState(file="001 - A - Kept.mp3", status=TrackStatus.downloaded),
                    "gone": TrackState(file="002 - A - Gone.mp3", status=TrackStatus.removed_from_source),
                    "missing": TrackState(status=TrackStatus.missing),
                },
            ))

            deleted = asyncio.run(_delete_removed_tracks(folder))

            self.assertEqual(deleted, 1)
            self.assertTrue((folder / "001 - A - Kept.mp3").exists())
            self.assertFalse((folder / "002 - A - Gone.mp3").exists())
            self.assertEqual(set(load_state(folder).tracks), {"kept", "missing"})

    def test_noop_without_removed_tracks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            folder = Path(temp_dir)
            save_state(folder, SpotifyJson(
                type=SourceType.album, spotify_id="album", spotify_url="https://example.test",
                name="Album", tracks={"t": TrackState(status=TrackStatus.missing)},
            ))
            self.assertEqual(asyncio.run(_delete_removed_tracks(folder)), 0)


if __name__ == "__main__":
    unittest.main()
