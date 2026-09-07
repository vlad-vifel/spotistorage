import { RotateCcw, X } from "lucide-react";
import {
  useDownloads, useRetryDownload, useCancelDownload,
  useCancelAllDownloads, useClearAllFailed,
} from "@/hooks/useDownloads";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrackStatusBadge } from "@/components/source/TrackStatusBadge";
import { showError } from "@/lib/toast";
import type { DownloadJob, TrackStatus } from "@/api/types";

interface Props {
  onClose: () => void;
}

function jobTrackStatus(job: DownloadJob): TrackStatus {
  if (job.status === "done") return "downloaded";
  return job.status as TrackStatus;
}

function JobRow({ job, index }: { job: DownloadJob; index: number }) {
  const retry = useRetryDownload();
  const cancel = useCancelDownload();

  return (
    <div className="group flex items-center gap-3 py-1.5 px-3 max-md:min-h-12 md:px-4 hover:bg-muted/40 transition-colors">
      <span className="text-xs text-muted-foreground w-7 text-center shrink-0 tabular-nums">{index}</span>
      <TrackStatusBadge status={jobTrackStatus(job)} job={job} />
      <span className="text-sm flex-1 truncate">
        {job.track_artist && <span className="text-muted-foreground">{job.track_artist} - </span>}
        {job.track_title}
      </span>
      {job.status === "failed" && (
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="tap-44 flex items-center gap-1 p-2 text-xs text-primary/80 hover:text-primary transition-colors"
                onClick={() => {
                  if (job.error) showError(job.error, "Retrying");
                  retry.mutate(job.id);
                }}
                disabled={retry.isPending}
                aria-label="Retry download"
              >
                <RotateCcw className="size-2.5" />
                retry
              </button>
            </TooltipTrigger>
            {job.error && <TooltipContent>{job.error}</TooltipContent>}
          </Tooltip>
          <button
            className="tap-44 flex items-center gap-0.5 p-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => cancel.mutate(job.id)}
            aria-label="Clear job"
          >
            <X className="size-2.5" />
            clear
          </button>
        </div>
      )}
      {(job.status === "queued" || job.status === "downloading") && (
        <button
          className="tap-44 flex items-center gap-0.5 p-2 text-xs text-muted-foreground hover:text-destructive shrink-0 transition-colors"
          onClick={() => cancel.mutate(job.id)}
          aria-label="Cancel download"
        >
          <X className="size-2.5" />
          cancel
        </button>
      )}
    </div>
  );
}

export function DownloadPanel({ onClose }: Props) {
  const { jobs, active, failed } = useDownloads();
  const cancelAll = useCancelAllDownloads();
  const clearAll = useClearAllFailed();

  return (
    <div className="border-t border-border/50 flex flex-col max-md:h-full max-md:min-h-0">
      <div className="flex justify-between items-center px-3 md:px-4 py-2 border-b border-border/50 shrink-0">
        <span className="text-xs font-medium">Download queue</span>
        <div className="flex items-center gap-3">
          {active.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => cancelAll.mutate()}
              disabled={cancelAll.isPending}
            >
              Cancel all
            </button>
          )}
          {failed.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              Clear all
            </button>
          )}
          <button
            className="p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            aria-label="Close download queue"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="max-md:flex-1 max-md:min-h-0 max-h-none md:max-h-56 overflow-y-auto">
        {jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm px-4 py-3">No active downloads</p>
        ) : (
          jobs.map((job, i) => <JobRow key={job.id} job={job} index={i + 1} />)
        )}
      </div>
    </div>
  );
}
