# SpotiStorage

Local-only web app: paste a Spotify URL → download MP3s with metadata → organize into folders.

## Prerequisites

Install these manually before running:

- **Node.js** 22+ and **npm**
- **Python** 3.12+ and **uv** (`pip install uv` or https://docs.astral.sh/uv/)
- **FFmpeg** — https://ffmpeg.org/download.html (must be in PATH)

All Python packages (including yt-dlp and SpotifyScraper) are installed automatically by uv.

Verify FFmpeg:
```
ffmpeg -version
```

## Install & Run

```
git clone <repo>
cd spotistorage
npm run install:all
npm run dev
```

Opens at http://localhost:5173 — first run shows the setup wizard.

## File Structure

```
{library_root}/
├── Playlists/{name}/        # .spotify.json + 01 - Artist - Title.mp3
├── Albums/{artist} - {album}/
└── Tracks/                  # standalone tracks
```

MP3s are self-contained (tags + artwork embedded). Copy any folder to a device — it works without the app.
