export type SourceType = "playlist" | "album" | "track";

export type TrackStatus =
  | "downloaded"
  | "missing"
  | "queued"
  | "downloading"
  | "failed"
  | "cancelled"
  | "removed_from_source"
  | "wrong_track";

export interface TrackInfo {
  id: string;
  file: string | null;
  status: TrackStatus;
  title?: string | null;
  artist?: string | null;
  position?: number | null;
}

export interface Source {
  id: string;
  type: SourceType;
  spotify_id: string;
  spotify_url: string;
  name: string;
  artwork_url?: string | null;
  last_refreshed?: string | null;
  total_tracks: number;
  downloaded_tracks: number;
  folder_path: string;
  tracks?: TrackInfo[];
}

export interface SpotifyTrackMeta {
  id: string;
  title: string;
  artists: string[];
  album: string;
  album_artist: string;
  track_number: number;
  year: string;
  artwork_url?: string;
}

export interface ResolveResult {
  type: SourceType;
  spotify_id: string;
  spotify_url: string;
  name: string;
  artwork_url?: string | null;
  total_tracks: number;
  downloaded_tracks: number;
  folder_path: string;
  already_in_library: boolean;
  tracks: SpotifyTrackMeta[];
}

export interface UserPlaylist {
  id: string;
  name: string;
  spotify_url: string;
  artwork_url?: string | null;
  total_tracks: number;
}

export interface UserResolveResult {
  type: "user";
  spotify_id: string;
  name: string;
  artwork_url?: string | null;
  playlists: UserPlaylist[];
}

export type AnyResolveResult = ResolveResult | UserResolveResult;

export type JobStatus = "queued" | "downloading" | "done" | "failed" | "cancelled";

export interface DownloadJob {
  id: string;
  source_id: string;
  track_id: string;
  track_title: string;
  track_artist: string;
  status: JobStatus;
  progress: number;
  error?: string;
}

export interface DownloadSummary {
  batch_id?: string | null;
  active: boolean;
  preparing: boolean;
  total: number;
  done: number;
  failed: number;
  cancelled: number;
  percent: number;
  current_track?: string | null;
}

export interface Library {
  id: string;
  name: string;
  root_path: string;
}

export interface AppConfig {
  libraries: Library[];
  active_library_id: string | null;
  setup_complete: boolean;
  sp_dc?: string | null;
  youtube_cookies_path?: string | null;
  youtube_cookies_content?: string | null;
  youtube_browser?: string | null;
  deezer_arl?: string | null;
  platform?: string;
}

export interface DepsStatus {
  ffmpeg: boolean;
  ffprobe: boolean;
  yt_dlp: boolean;
  pycryptodome: boolean;
  js_runtime: boolean;
  all_ok: boolean;
}

export interface QueuedResult {
  queued: number;
  preparing?: boolean;
  batch_id?: string;
  total?: number;
}

export interface RefreshResult {
  new: number;
  renamed: number;
  downloaded: number;
  missing: number;
  removed_from_source: number;
}

export interface RefreshAllResult {
  refreshed: number;
  new: number;
  removed_from_source: number;
  errors: number;
}
