<p align="center">
  <img src="frontend/public/favicon.svg" width="72" height="72" alt="SpotiStorage logo" />
</p>

<h1 align="center">SpotiStorage</h1>

<p align="center">
  Local-only web app: paste a Spotify URL → download real MP3 files with metadata → organize into folders.<br>
  No streaming, no cloud, no lock-in — the files it makes work with or without the app.
</p>

## Desktop

### Prerequisites

Install these manually before running:

- **Node.js** 22+ and **npm**
- **Python** 3.12+ and **uv** (`pip install uv` or https://docs.astral.sh/uv/)
- **FFmpeg** — https://ffmpeg.org/download.html (must be in PATH)

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

Opens at http://localhost:5173 — first run shows the setup wizard.

## Android

An Android build lives in `android/` — same backend, same UI, running inside a WebView with an embedded Python runtime (Chaquopy). Pre-built APKs are published on the [Releases](../../releases) page; that's the intended way to install it — you don't need Android Studio just to use the app.

Want to build it yourself (e.g. to contribute)? You'll need Android Studio and the desktop backend's `.venv` set up first (`uv sync --directory backend`), then:
```
npm run build --prefix frontend
cd android
./gradlew assembleDebug
```
The debug APK lands in `android/app/build/outputs/apk/debug/`.

## File Structure

```
{library_root}/
├── Playlists/{name}/        # .spotify.json + 01 - Artist - Title.mp3
├── Albums/{artist} - {album}/
└── Tracks/                  # standalone tracks
```

MP3s are self-contained (tags + artwork embedded). Copy any folder to a device — it works without the app.
