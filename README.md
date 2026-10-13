<p align="center">
  <img src="frontend/public/favicon.svg" width="72" height="72" alt="SpotiStorage logo" />
</p>

<h1 align="center">SpotiStorage</h1>

<p align="center">
  A local-only Spotify downloader: paste a URL, get real MP3 files with metadata, organized into folders.<br>
  Runs as a Windows app, an Android app or from source – no streaming, no cloud, no lock-in.
</p>

## Windows App

Download `SpotiStorage-Setup-vX.Y.Z.exe` from the [Releases](../../releases) page and run it. It installs for your user only (no admin rights), adds a Start menu shortcut and bundles everything it needs – FFmpeg, the JS runtime and Python are inside, nothing to install separately.

The installer isn't code-signed, so Windows SmartScreen may show "Windows protected your PC" on first run – click **More info → Run anyway**.

- Settings, the download queue and logs live in `%APPDATA%\SpotiStorage` (logs in `logs\app.log`). Uninstalling keeps this folder and never touches your music library.
- Closing the window quits the app by default (with a confirmation if downloads are running). Switch to "Minimize to tray" in Settings → Window to keep downloads going in the background.
- When a newer release is out, Settings and the header show an "Update available" link to it.

To build the app yourself:
```
npm run desktop          # run the desktop shell from source (window + tray, no packaging)
npm run desktop:build    # build the .exe and installer into desktop/dist/ (needs Inno Setup 6)
```

## Run from Source

### Prerequisites

Install these manually before running:

- **Node.js** 22+ and **npm**
- **Python** 3.12+ and **uv** (`pip install uv` or https://docs.astral.sh/uv/)
- **FFmpeg** – https://ffmpeg.org/download.html (must be in PATH)

All Python packages (including yt-dlp and SpotifyScraper) are installed automatically by uv.

Verify FFmpeg:
```
ffmpeg -version
```

### Install & Run

```
git clone <repo>
cd spotistorage
npm run install:all
npm run dev
```

Opens at http://localhost:5173 – first run shows the setup wizard.

## Android

An Android build lives in `android/` – same backend, same UI, running inside a WebView with an embedded Python runtime (Chaquopy). Pre-built APKs are published on the [Releases](../../releases) page; that's the intended way to install it – you don't need Android Studio just to use the app.

Want to build it yourself (e.g. to contribute)? You'll need Android Studio and the desktop backend's `.venv` set up first (`uv sync --directory backend`), then:
```
./install-android.sh
```
The script builds the current frontend, builds the APK and installs it on the connected device. It first tries an in-place update; if the installed APK has a different signing key, it removes that app package and installs the debug build. This reset removes app data, but not the music already stored in the selected library folder.

To build without installing, run `./gradlew assembleDebug` from `android/`. Gradle builds the current frontend automatically. The debug APK lands in `android/app/build/outputs/apk/debug/`.

## Checks

```bash
npm run lint --prefix frontend
uv run --directory backend python -m unittest discover -s tests
```

Pull requests run the same frontend checks, backend tests, Android debug build and a packaged Windows build (with a startup self-test) in GitHub Actions. Pushing a `v*` tag builds the signed APK and the Windows installer and attaches both to one GitHub Release.

Signed release APKs use the repository Actions secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. The keystore itself must never be committed to the repository.

## File Structure

```
{library_root}/
├── Playlists/{name}/        # .spotify.json + 001 - Artist - Title.mp3
├── Albums/{artist} - {album}/
└── Tracks/                  # standalone tracks
```

MP3s are self-contained (tags + artwork embedded). Copy any folder to a device – it works without the app.
