import { useMemo, useState } from "react";
import type { TrackInfo } from "@/api/types";

export type SortKey = "position" | "status";
export type SortDir = "asc" | "desc";

const STATUS_RANK: Partial<Record<string, number>> = {
  failed: 0,
  wrong_track: 1,
  removed_from_source: 1,
  downloaded: 2,
};
function statusRank(s: string) {
  return STATUS_RANK[s] ?? 3;
}

function matchesQuery(track: TrackInfo, words: string[]): boolean {
  const haystack = `${track.title ?? ""} ${track.artist ?? ""} ${track.file ?? ""}`.toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export function useTrackSortFilter(tracks: TrackInfo[] | undefined, search: string) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const list = tracks ?? [];
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const result = words.length === 0 ? list : list.filter((t) => matchesQuery(t, words));
    return [...result].sort((a, b) => {
      if (sortKey === "status") {
        const rd = statusRank(a.status) - statusRank(b.status);
        if (rd !== 0) return sortDir === "asc" ? rd : -rd;
        return (a.position ?? 9999) - (b.position ?? 9999);
      }
      const d = (a.position ?? 9999) - (b.position ?? 9999);
      return sortDir === "asc" ? d : -d;
    });
  }, [tracks, search, sortKey, sortDir]);

  return { filtered, sortKey, sortDir, toggleSort };
}
