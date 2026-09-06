import type { Source } from "@/api/types";

export function getSourceBadgeVariant(
  downloaded: number,
  total: number
): "destructive" | "warning" | "success" {
  if (downloaded === 0) return "destructive";
  if (downloaded < total) return "warning";
  return "success";
}

export function getMissingCount(source: Source): number {
  return source.tracks
    ? source.tracks.filter((t) => t.status === "missing" || t.status === "wrong_track").length
    : Math.max(0, source.total_tracks - source.downloaded_tracks);
}
