import { memo, useState } from "react";
import { TrackStatusBadge } from "./TrackStatusBadge";
import { TrackActionButton } from "./TrackActionButton";
import { TrackDeleteDialog } from "./TrackDeleteDialog";
import { useRetryDownload } from "@/hooks/useDownloads";
import { useDownloadSingleTrack, useDeleteTrack } from "@/hooks/useSources";
import type { TrackInfo, TrackStatus, DownloadJob } from "@/api/types";

interface Props {
  track: TrackInfo;
  position: number;
  sourceId: string;
  job?: DownloadJob;
}

export const TrackRow = memo(function TrackRow({ track, position, sourceId, job }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const retry = useRetryDownload();
  const downloadTrack = useDownloadSingleTrack();
  const deleteTrack = useDeleteTrack();

  const effectiveStatus: TrackStatus =
    job?.status === "done" ? "downloaded"
    : job ? (job.status as TrackStatus)
    : track.status;

  const isRemoved = effectiveStatus === "removed_from_source";

  return (
    <>
      <div className="group h-14 flex items-center gap-4 px-4 border border-transparent hover:bg-muted/40 hover:border-border rounded transition-colors">
        <span className="text-muted-foreground text-xs w-8 text-center shrink-0 tabular-nums cursor-default">
          {isRemoved ? "*" : position}
        </span>
        <div className="flex-1 min-w-0 cursor-default">
          <p className="text-sm text-foreground truncate">{track.title ?? track.file ?? track.id}</p>
          {track.artist && (
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          )}
        </div>
        <div className="flex items-center justify-center w-16 shrink-0">
          <TrackStatusBadge status={effectiveStatus} job={job} />
        </div>
        <div className="flex items-center justify-center w-8 shrink-0">
          <TrackActionButton
            status={effectiveStatus}
            job={job}
            onRetry={() => job && retry.mutate(job.id)}
            onDownload={() => downloadTrack.mutate({ sourceId, trackId: track.id })}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      <TrackDeleteDialog
        trackTitle={track.title ?? track.file ?? track.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          deleteTrack.mutate(
            { sourceId, trackId: track.id },
            { onSuccess: () => setDeleteOpen(false) }
          );
        }}
        isPending={deleteTrack.isPending}
      />
    </>
  );
});
