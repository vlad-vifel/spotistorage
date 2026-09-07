import { Download, RotateCcw, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showError } from "@/lib/toast";
import type { TrackStatus, DownloadJob } from "@/api/types";

interface Props {
  status: TrackStatus;
  job?: DownloadJob;
  onRetry: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function TrackActionButton({ status, job, onRetry, onDownload, onDelete }: Props) {
  if (status === "downloaded" || status === "removed_from_source" || status === "wrong_track") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="p-2.5 -m-2.5 text-muted-foreground hover:text-destructive transition-colors"
            onClick={onDelete}
            aria-label="Delete track"
          >
            <Trash2 size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Delete track from device</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="p-2.5 -m-2.5 text-destructive hover:text-destructive/70 transition-colors"
            onClick={() => {
              if (job?.error) showError(job.error, "Retrying");
              onRetry();
            }}
            aria-label="Retry download"
          >
            <RotateCcw size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{job?.error ?? "Click to retry"}</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "missing") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onDownload}
            aria-label="Download track"
          >
            <Download size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Download this track</TooltipContent>
      </Tooltip>
    );
  }
  return null;
}
