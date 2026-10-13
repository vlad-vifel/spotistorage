# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules, copy_metadata

DESKTOP = Path(SPECPATH)
ROOT = DESKTOP.parent
BUILD = DESKTOP / "build"

datas = [
    (str(ROOT / "frontend" / "dist"), "."),
    (str(ROOT / "backend" / "bin" / "qjs.exe"), "bin"),
    (str(DESKTOP / "assets" / "icon.ico"), "."),
]
datas += copy_metadata("spotistorage-backend")
binaries = []
hiddenimports = collect_submodules("app")

for package in ("yt_dlp", "yt_dlp_ejs", "spotify_scraper", "uvicorn", "webview", "pystray"):
    package_datas, package_binaries, package_hiddenimports = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hiddenimports

a = Analysis(
    [str(DESKTOP / "launcher.py")],
    pathex=[str(DESKTOP), str(ROOT / "backend")],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["tkinter", "_tkinter", "PyQt5", "PyQt6", "PySide2", "PySide6", "qtpy", "gi"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SpotiStorage",
    console=False,
    icon=str(DESKTOP / "assets" / "icon.ico"),
    version=str(BUILD / "version_info.txt"),
)
coll = COLLECT(exe, a.binaries, a.datas, name="SpotiStorage")
