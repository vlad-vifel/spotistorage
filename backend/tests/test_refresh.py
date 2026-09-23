import tempfile
import unittest
from pathlib import Path

from app.models.source import SourceType, SpotifyJson, TrackState, TrackStatus
from app.services.refresh import _normalize_track_filenames


class RefreshFilenameTests(unittest.TestCase):
    def test_migrates_legacy_two_digit_filename(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            folder = Path(temp_dir)
            old_name = "01 - Artist - Song.mp3"
            (folder / old_name).write_bytes(b"audio")
            state = SpotifyJson(
                type=SourceType.playlist, spotify_id="playlist", spotify_url="https://example.test",
                name="Playlist", tracks={"track": TrackState(
                    file=old_name, status=TrackStatus.downloaded, title="Song", artist="Artist", position=1,
                )},
            )

            renamed = _normalize_track_filenames(folder, state)

            self.assertEqual(renamed, 1)
            self.assertEqual(state.tracks["track"].file, "001 - Artist - Song.mp3")
            self.assertTrue((folder / "001 - Artist - Song.mp3").exists())

    def test_swaps_reordered_tracks_without_overwriting(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            folder = Path(temp_dir)
            first_name = "001 - Artist - First.mp3"
            second_name = "002 - Artist - Second.mp3"
            (folder / first_name).write_bytes(b"first")
            (folder / second_name).write_bytes(b"second")
            state = SpotifyJson(
                type=SourceType.playlist, spotify_id="playlist", spotify_url="https://example.test",
                name="Playlist", tracks={
                    "first": TrackState(file=first_name, status=TrackStatus.downloaded, title="First", artist="Artist", position=2),
                    "second": TrackState(file=second_name, status=TrackStatus.downloaded, title="Second", artist="Artist", position=1),
                },
            )

            renamed = _normalize_track_filenames(folder, state)

            self.assertEqual(renamed, 2)
            self.assertEqual((folder / "002 - Artist - First.mp3").read_bytes(), b"first")
            self.assertEqual((folder / "001 - Artist - Second.mp3").read_bytes(), b"second")
