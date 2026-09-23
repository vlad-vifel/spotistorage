import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def package_name(requirement: str) -> str:
    return re.split(r"[<>=!~\[]", requirement, maxsplit=1)[0].strip().lower().replace("_", "-")


class AndroidDependencyParityTests(unittest.TestCase):
    def test_chaquopy_requirements_cover_backend_runtime(self) -> None:
        pyproject = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
        backend_dependencies = {
            package_name(requirement)
            for requirement in re.findall(r'^\s*"([^"]+)"', pyproject, re.MULTILINE)
        }
        android_dependencies = {
            package_name(line)
            for line in (ROOT / "android-requirements.txt").read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        }
        self.assertEqual(android_dependencies - {"pydantic"}, backend_dependencies)
