import { memo, useState } from "react";
import { TrackStatusBadge } from "./TrackStatusBadge";
import { TrackActionButton } from "./TrackActionButton";
import { TrackDeleteDialog } from "./TrackDeleteDialog";
import { useRetryDownload } from "@/hooks/useDownloads";
import { useDownloadSingleTrack, useDeleteTrack } from "@/hooks/useSources";
import { cn } from "@/lib/utils";
import { TRACK_ROW, COL_POSITION, COL_TITLE, COL_STATUS, COL_ACTION } from "./trackColumns";
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

  const isJobLive = job?.status === "queued" || job?.status === "downloading" || job?.status === "failed";
  const effectiveStatus: TrackStatus = isJobLive ? (job!.status as TrackStatus) : track.status;

  const isRemoved = effectiveStatus === "removed_from_source";

  return (
    <>
      <div className={cn(TRACK_ROW, "group h-14 border border-transparent hover:bg-muted/40 hover:border-border rounded transition-colors")}>
        <span className={cn(COL_POSITION, "text-muted-foreground text-xs tabular-nums cursor-default")}>
          {isRemoved ? "*" : position}
        </span>
        <div className={cn(COL_TITLE, "cursor-default")}>
          <p className="text-sm text-foreground truncate">
            {isRemoved && <span className="md:hidden">* </span>}
            {track.title ?? track.file ?? track.id}
          </p>
          {track.artist && (
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          )}
        </div>
        <div className={COL_STATUS}>
          <TrackStatusBadge status={effectiveStatus} job={job} />
        </div>
        <div className={COL_ACTION}>
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
