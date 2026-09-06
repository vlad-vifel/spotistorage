# CLAUDE.md — SpotiStorage

## Core Principle

**The filesystem is the product. The web app is the control panel.**
Users must end up with normal, well-organized MP3 files usable without the app (copy to microSD, player, etc.).

## What It Does

Local-only web app: paste Spotify URL (playlist/album/track/user profile) → detect type → fetch metadata via SpotifyScraper → compare with local state → download missing tracks (Deezer first if an ARL cookie is configured, yt-dlp/YouTube search as fallback) → verify duration → embed metadata + artwork → organize into folders.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`), shadcn/ui (no Next.js)
- **Backend:** Python 3.12+, FastAPI, Uvicorn, uv
- **Download engine:** SpotifyScraper (Spotify metadata/search). Audio comes from Deezer's private API (`services/deezer.py`, requires a user-supplied `arl` cookie) tried first, then yt-dlp/YouTube search (`services/yt_download.py`) as fallback. Candidate ranking lives in `services/matching.py`. Do NOT reimplement this search/matching logic.
- **Metadata:** Mutagen (MP3/ID3 tags)
- **Download queue:** SQLite via aiosqlite — ephemeral job state only, NOT library state (library state lives in `.spotify.json` files)
- **External deps:** FFmpeg (must be in PATH), Node.js 22+ (yt-dlp's JS runtime for YouTube's player challenge). All Python packages including yt-dlp are managed by uv. Detect missing deps at startup (`services/deps_check.py`, `GET /api/dependencies`), never silently install.

## Non-Goals

No Spotify streaming, no cloud/SaaS, no multi-user, no Electron, no Docker as primary startup, no persistent database for library data (SQLite is used only for the ephemeral download queue), no Spotify OAuth/Client ID/Secret — SpotifyScraper handles auth internally.

## Architecture

```
Browser (React+Vite) → HTTP/JSON → FastAPI → SpotifyScraper + Deezer/yt-dlp + FFmpeg → Local filesystem
```

Frontend never touches filesystem directly. Backend owns all FS operations.

## Dev Startup

Single command: `npm run dev` starts both frontend (:5173) and backend (:8000) via `concurrently`. Vite proxy routes `/api/*` to backend. Terminal output prefixed `[FRONTEND]`/`[BACKEND]`.

## Project Structure

```
spotistorage/
├── frontend/          # React app (src/pages, components/, hooks/, lib/, api/)
├── backend/           # FastAPI app
│   └── app/
│       ├── main.py      # App setup, CORS, router registration, startup deps check
│       ├── api/          # Route handlers (config, libraries, sources, downloads, dependencies)
│       ├── services/     # Business logic — see below
│       ├── models/       # Pydantic models (config, source/track state, download job)
│       └── core/         # paths.py (safe path resolution), atomic_write.py, state_locks.py
├── config/user.json   # User config incl. secrets (git-ignored)
├── config/jobs.db      # Ephemeral download queue (git-ignored, cleared on restart)
├── package.json       # Root: concurrently runs both
└── README.md
```

Key backend services: `spotify_resolve.py` (Spotify metadata + resolve cache), `yt_download.py` (yt-dlp download + shared ydl options), `deezer.py` (Deezer private-API download), `matching.py` (candidate ranking/duration matching), `download_queue.py` (the async job queue), `download_orchestration.py` (resolve-then-enqueue glue shared by the download routes), `refresh.py` (re-sync a source against Spotify), `state_store.py`/`library_scan.py`/`source_lookup.py` (read/write/find `.spotify.json`), `config_store.py` (`config/user.json`), `metadata.py` (ID3 embedding), `filenames.py` (sanitization + naming templates), `audio_engine.py` (thin re-export facade over `spotify_resolve` + `yt_download` for backward-compat call sites).

## Filesystem Layout (user's music library)

```
{library_root}/
├── Playlists/{name}/        # Physical folders per playlist
│   ├── .spotify.json        # Source metadata + track→file map
│   └── 01 - Artist - Title.mp3
├── Albums/{artist} - {album}/
│   ├── .spotify.json
│   └── 01 - Artist - Title.mp3
└── Tracks/
    └── Artist - Title.mp3
```

Filename templates: `{position} - {artists} - {title}.mp3` (playlist/album), `{artists} - {title}.mp3` (standalone). Filenames are NOT authoritative identity — Spotify Track ID is.

## Track Identity & State

Primary key: **Spotify Track ID**. Each `.spotify.json` maps track IDs → local filenames. Track status is one of `missing | downloaded | removed_from_source | wrong_track` (`wrong_track` = downloaded file's duration doesn't match Spotify's, flagged on refresh, user can retry):

```json
{"type": "playlist", "spotify_id": "...", "spotify_url": "...", "name": "...",
 "last_refreshed": "2026-01-01T00:00:00+00:00",
 "tracks": {"track-id-1": {"file": "01 - Artist - Title.mp3", "status": "downloaded"}}}
```

`last_refreshed` is stamped both when a source is first added (the add flow already fetches fresh Spotify data) and on every manual refresh — not on the filesystem-scan-at-startup path.

## Sync Logic

**Refresh** (user-triggered, single source or all): re-fetch Spotify source → compare track IDs → show new/downloaded/removed counts → re-check downloaded files' durations (flags `wrong_track`) → download only missing.
**Filesystem scan** (startup + every list/get request): check which local files exist, update state. Don't re-fetch Spotify on every scan — only an explicit refresh talks to Spotify.
**Removed tracks**: never auto-delete. Inform user, keep local files.
**Reordering**: rename via temp files (`.tmp-track-NNN.mp3`) to avoid collisions.
**Duplicates across playlists**: intentional physical copies — no dedup system.
**Concurrency**: writes to a source's `.spotify.json` (delete/add/download-complete/refresh) are serialized per-folder via an `asyncio.Lock` (`core/state_locks.py`). Routes that can trigger a state write must be `async def`, not plain `def` — FastAPI runs sync `def` routes in a threadpool thread, which the lock cannot protect against.

## Downloads

Async queue, concurrency locked at 1 (misbehaves with concurrent downloads on either Deezer or yt-dlp; increasing concurrency is planned). Flow per track: try Deezer (if ARL configured) → fall back to yt-dlp/YouTube search + duration/keyword ranking → verify file size + duration → embed metadata/artwork via Mutagen → rename to final. Failed tracks don't abort the batch; user can retry individually or retry with a manually-supplied Deezer/YouTube URL (bypasses search entirely). Auto-retry up to 5 times with exponential backoff for transient failures (duration mismatch / "track not found" are treated as permanent, no auto-retry). Queue state persists in SQLite (`config/jobs.db`) and is cleared on server restart (queued items dropped, failed items retained for display). Bulk refresh-all/download-all resolve against Spotify with bounded concurrency (a semaphore), not fully sequential or fully parallel.

## Metadata & Artwork

Embed into MP3 via Mutagen: title, artist, album, album artist, track/disc number, year, artwork. No separate artwork cache — artwork lives inside MP3. No large metadata blobs in JSON.

## Config

Stored in `config/user.json` (git-ignored), editable only via UI. Supports multiple independent libraries (each with own root dir, playlists, albums, state). First launch: setup wizard (pick music folder, format=MP3).

Also holds optional download-source credentials: `sp_dc` (Spotify session cookie, only needed to resolve user-profile URLs), `deezer_arl` (Deezer session cookie, enables Deezer as a download source), and `youtube_cookies_path`/`youtube_browser` (yt-dlp cookie source, for age-restricted videos). `GET /api/config` returns these masked (`config_store.mask_secrets`); the dedicated `PUT /api/config/{sp-dc,deezer-arl,youtube-cookies}` endpoints take the real value.

## Library Recovery

If app is reinstalled, pointing at same library dir recovers state from `.spotify.json` files and existing MP3s.

## UI Design

Dark-only. Zinc oklch palette via CSS tokens in `frontend/src/index.css` (`@theme inline` block). No hardcoded hex values in components — always reference tokens. Four semantic accents used beyond zinc:
- `text-emerald-400` — downloaded/success status
- `text-blue-400` — downloading/in-progress status
- `text-amber-400` — warning/removed-from-source status
- `text-destructive` / `bg-destructive/10` — failed/error status

Elevation: `ring-1 ring-foreground/10` instead of drop shadows. Hover language: `transition-colors hover:bg-muted/40`. Card recipe: `rounded-lg border border-border/50 bg-card`. Empty state recipe: `rounded-xl border border-border/50 bg-card p-12` with centred icon, title, subtitle.

Shell: 188px inset sidebar (`AppSidebar`) + `SidebarInset` flex column. `DownloadBar` is a flow child at the bottom of the inset column — not `fixed`. `Cmd/Ctrl+B` toggles sidebar; state persists via cookie.

Main nav: Library, Add (paste URL), Errors, Settings. Library switcher lives in the sidebar footer `DropdownMenu`.

Key views: source page (track list with status badges, refresh + download, external link to the source on Spotify), errors page (failed downloads across the library, retry/retry-with-url/clear), settings (library management, system dependencies, download-source credentials), add page (URL input with soft validation, resolve preview; also handles Spotify user-profile URLs by listing public playlists).

Always reach for an existing `components/ui/` primitive (or add one via shadcn conventions) over a hand-rolled native form element — e.g. a native `<select>`/`<input type="checkbox">` — so behavior/theming stays consistent.

## React Component Rules

- **Max size: 200 lines per component file, target ~100 lines.** If a component grows beyond that, extract logic into a hook in `hooks/` or split markup into a child component in the same folder.
- **No `.tsx` files in `src/` root** except `main.tsx` and `App.tsx`. All components live in semantic subfolders:
  - `components/layout/` — AppShell, AppSidebar, DownloadBar, DownloadPanel
  - `components/url/` — ResolvePreview, UserProfilePreview
  - `components/library/` — SourceList, SourceCard
  - `components/source/` — SourceHeader, CompactBar, SourceActions, TrackTable, TrackRow, TrackStatusBadge, RefreshBanner, DeleteSourceDialog, TrackDeleteDialog
  - `components/settings/` — LibraryPathSetting, DeleteLibraryDialog, SpotifyCookieSetting, DeezerArlSetting, YoutubeCookiesSetting, SecretCookieSetting (shared by the two cookie settings), DependencyStatus
  - `components/setup/` — SetupWizard, StepFolder, StepDeps
  - `components/common/` — small cross-page building blocks: SourceArtwork, MediaCard (shared artwork+content card layout), EmptyState, SearchInput, CenteredSpinner, CircularProgress
  - `components/ui/` — shadcn/ui primitives (generated output, do not hand-edit these unless adding a variant)
  - `pages/` — thin page shells (LibraryPage, SourcePage, SettingsPage, SetupPage, AddPage, ErrorsPage)
  - `hooks/` — all custom hooks; split by concern once a hook file grows (e.g. `useSourceQueries`/`useSourceMutations`, re-exported together from `useSources` so call sites don't churn), plus flow-specific hooks like `useDeleteSourceFlow`, `useAddAndDownload`, `useTrackSortFilter`
  - `lib/` — pure utilities: `utils.ts` (`cn`, `capitalize`, `pluralize`, `formatLocalTime`), `status.ts` (badge-variant + missing-track-count helpers), `toast.ts` (sonner wrappers)

## Filesystem Safety

Sanitize all filenames from external metadata. Prevent path traversal. Handle Windows FS limitations. Handle duplicate filenames. Never let generated paths escape library root.

## Performance

Support 300+ track playlists as normal case. No hard-coded limits. Use pagination/virtualization if needed.

## API (approximate)

```
GET/PUT  /api/config (secrets masked on GET)
PUT      /api/config/sp-dc, /api/config/youtube-cookies, /api/config/deezer-arl
GET      /api/config/browse-folder, /api/config/browse-file
GET/POST /api/libraries, DELETE /api/libraries/{id}
POST     /api/sources/resolve, POST /api/sources
GET      /api/sources, /api/sources/{id}
DELETE   /api/sources/{id}, /api/sources/{id}/tracks/{track_id}
POST     /api/sources/{id}/download, /api/sources/{id}/refresh
POST     /api/sources/refresh-all, /api/sources/download-all
POST     /api/sources/{id}/tracks/{track_id}/download
GET      /api/downloads
POST     /api/downloads/{id}/retry, /api/downloads/{id}/retry-with-url
POST     /api/downloads/clear-failed
DELETE   /api/downloads/{id}, /api/downloads
GET      /api/dependencies, /api/health
```

## Code Rules

1. No comments unless genuinely necessary (non-obvious behavior, workarounds)
2. No speculative features
3. No persistent database for library data (SQLite for download queue only)
4. No Spotify OAuth/credentials
5. No Docker as primary startup
6. Prefer simple solutions and incremental changes
7. Read existing code before modifying
8. Don't rewrite working code
9. Keep frontend/backend responsibilities separated
10. Treat all external metadata as untrusted input
11. Never silently delete files or install system deps
12. Don't launch browser for verification — user tests UI themselves; only use browser tools for specific technical debugging
13. Use Tailwind scale values for text sizes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.); avoid arbitrary sizes like `text-[10px]` or `text-[11px]` — only break this rule when strictly necessary

## Git Commits

Only `feat:` or `fix:` prefix. English, ~10 words max, no AI attribution.
```
feat: add playlist synchronization
fix: prevent duplicate downloads
```

## MVP Done When

User can: clone → install → `npm run dev` → setup wizard → paste playlist/album/track URL → see metadata + download status → download missing → get properly named MP3s with metadata/artwork → restart and see library intact → refresh playlist later → detect + download new tracks → handle 300+ track playlists → copy folder to external device and use independently.
