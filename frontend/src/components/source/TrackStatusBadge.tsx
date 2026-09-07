import { CheckCircle2, Clock, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircularProgress } from "@/components/common/CircularProgress";
import { showInfo } from "@/lib/toast";
import type { TrackStatus, DownloadJob } from "@/api/types";

interface Props {
  status: TrackStatus;
  job?: DownloadJob;
}

const ICON_STATUS: Partial<Record<TrackStatus, { Icon: LucideIcon; className: string; label: string }>> = {
  downloaded: { Icon: CheckCircle2, className: "text-emerald-400", label: "Downloaded" },
  queued: { Icon: Clock, className: "text-muted-foreground", label: "Queued for download" },
  removed_from_source: { Icon: AlertTriangle, className: "text-amber-400", label: "Removed from source - file kept" },
  failed: { Icon: XCircle, className: "text-destructive", label: "Download failed" },
  wrong_track: { Icon: AlertTriangle, className: "text-amber-400", label: "Wrong track – duration doesn't match Spotify" },
};

export function TrackStatusBadge({ status, job }: Props) {
  if (status === "downloading") {
    const label = "Downloading";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => showInfo(label)} className="text-blue-400">
            <CircularProgress value={job?.progress ?? 0} indeterminate />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  const meta = ICON_STATUS[status];
  if (!meta) return null;
  const { Icon, className } = meta;
  const label = status === "failed" ? job?.error ?? meta.label : meta.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={() => showInfo(label)} className={className}>
          <Icon size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
