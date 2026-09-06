import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircularProgress } from "@/components/common/CircularProgress";
import type { TrackStatus, DownloadJob } from "@/api/types";

interface Props {
  status: TrackStatus;
  job?: DownloadJob;
}

export function TrackStatusBadge({ status, job }: Props) {
  if (status === "downloaded") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle2 size={15} className="text-emerald-400 cursor-default" />
        </TooltipTrigger>
        <TooltipContent>Downloaded</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "downloading") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-blue-400 cursor-default">
            <CircularProgress value={job?.progress ?? 0} indeterminate />
          </span>
        </TooltipTrigger>
        <TooltipContent>Downloading</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "queued") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Clock size={15} className="text-muted-foreground cursor-default" />
        </TooltipTrigger>
        <TooltipContent>Queued for download</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "removed_from_source") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle size={15} className="text-amber-400 cursor-default" />
        </TooltipTrigger>
        <TooltipContent>Removed from source - file kept</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <XCircle size={15} className="text-destructive cursor-default" />
        </TooltipTrigger>
        <TooltipContent>{job?.error ?? "Download failed"}</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "wrong_track") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle size={15} className="text-amber-400 cursor-default" />
        </TooltipTrigger>
        <TooltipContent>Wrong track – duration doesn't match Spotify</TooltipContent>
      </Tooltip>
    );
  }
  return null;
}
