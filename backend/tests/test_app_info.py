import unittest
from unittest import mock

from app.api import app_info
from app.core.compat import model_validate
from app.models.config import AppConfig


class UpdateInfoTests(unittest.TestCase):
    def test_newer_release_is_reported(self) -> None:
        info = app_info.update_info("0.1.3", {"tag": "v0.2.0", "url": "https://example.test/v0.2.0"})

        self.assertTrue(info["update_available"])
        self.assertEqual(info["latest_version"], "0.2.0")
        self.assertEqual(info["release_url"], "https://example.test/v0.2.0")

    def test_same_or_older_release_is_not_an_update(self) -> None:
        self.assertFalse(app_info.update_info("0.1.10", {"tag": "v0.1.9", "url": "u"})["update_available"])
        self.assertFalse(app_info.update_info("0.1.3", {"tag": "v0.1.3", "url": "u"})["update_available"])

    def test_unknown_versions_are_not_an_update(self) -> None:
        self.assertFalse(app_info.update_info(None, {"tag": "v9.9.9", "url": "u"})["update_available"])
        self.assertFalse(app_info.update_info("0.1.3", {"tag": "nightly", "url": "u"})["update_available"])
        info = app_info.update_info("0.1.3", None)
        self.assertFalse(info["update_available"])
        self.assertEqual(info["release_url"], app_info.RELEASES_URL)

    def test_network_failure_returns_none(self) -> None:
        with mock.patch("urllib.request.urlopen", side_effect=OSError("offline")):
            self.assertIsNone(app_info._fetch_latest_release())


class CloseActionConfigTests(unittest.TestCase):
    def test_old_config_defaults_to_quit(self) -> None:
        config = model_validate(AppConfig, {"libraries": [], "setup_complete": True})

        self.assertEqual(config.close_action, "quit")


if __name__ == "__main__":
    unittest.main()
