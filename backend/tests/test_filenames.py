import unittest

from app.services.filenames import standalone_filename, track_filename


class FilenameTests(unittest.TestCase):
    def test_long_track_filename_stays_within_component_limit(self) -> None:
        artists = [f"Artist {index} with a deliberately long name" for index in range(20)]
        filename = track_filename(7, artists, "A title with enough text to exceed the filesystem limit")

        self.assertLessEqual(len(filename), 240)
        self.assertTrue(filename.startswith("007 - "))
        self.assertTrue(filename.endswith(".mp3"))
        self.assertRegex(filename, r"~[0-9a-f]{8}\.mp3$")

    def test_short_filenames_keep_the_existing_shape(self) -> None:
        self.assertEqual(track_filename(1, ["Artist"], "Song"), "001 - Artist - Song.mp3")
        self.assertEqual(standalone_filename(["Artist"], "Song"), "Artist - Song.mp3")


if __name__ == "__main__":
    unittest.main()
