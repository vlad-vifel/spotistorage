import { useMemo } from "react";
import { TrackRow } from "./TrackRow";
import { useDownloads } from "@/hooks/useDownloads";
import type { TrackInfo } from "@/api/types";

interface Props {
  tracks: TrackInfo[];
  sourceId: string;
}

export function TrackTable({ tracks, sourceId }: Props) {
  const { jobs } = useDownloads();

  const jobMap = useMemo(() => {
    const map = new Map<string, (typeof jobs)[0]>();
    for (const j of jobs) {
      if (j.source_id === sourceId) map.set(j.track_id, j);
    }
    return map;
  }, [jobs, sourceId]);

  if (tracks.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No tracks match</p>;
  }

  return (
    <>
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          position={track.position ?? i + 1}
          sourceId={sourceId}
          job={jobMap.get(track.id)}
        />
      ))}
    </>
  );
}
