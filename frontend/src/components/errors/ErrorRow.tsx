import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronUp, Link2, RotateCcw, X } from "lucide-react";
import {
  useRetryDownload, useRetryWithUrl, useCancelDownload,
} from "@/hooks/useDownloads";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DownloadJob } from "@/api/types";

export function ErrorRow({ job, sourceName }: { job: DownloadJob; sourceName: string }) {
  const retry = useRetryDownload();
  const retryWithUrl = useRetryWithUrl();
  const clear = useCancelDownload();
  const [expanded, setExpanded] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    retryWithUrl.mutate(
      { jobId: job.id, url: trimmed },
      { onSuccess: () => { setShowUrlInput(false); setUrl(""); } }
    );
  };

  return (
    <div className="divide-y divide-border/30">
      <div
        className={cn("flex items-center gap-3 px-4 py-3", job.error && "cursor-pointer")}
        onClick={() => job.error && setExpanded((v) => !v)}
      >
        <AlertCircle className="size-4 text-destructive shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">
            {job.track_artist && <span>{job.track_artist} – </span>}
            {job.track_title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            <Link to={`/library/${job.source_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {sourceName}
            </Link>
            {job.error && !expanded && ` · ${job.error}`}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {job.error && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput((v) => !v)}
            aria-pressed={showUrlInput}
          >
            <Link2 className="size-3.5" /> Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => retry.mutate(job.id)}
            disabled={retry.isPending}
          >
            <RotateCcw className="size-3.5" /> Retry
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clear.mutate(job.id)}
            disabled={clear.isPending}
          >
            <X className="size-3.5" /> Clear
          </Button>
        </div>

        <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            label="Track actions"
            items={[
              { label: "Retry with link", icon: Link2, onSelect: () => setShowUrlInput((v) => !v) },
              { label: "Retry", icon: RotateCcw, onSelect: () => retry.mutate(job.id), pending: retry.isPending },
              { label: "Clear", icon: X, onSelect: () => clear.mutate(job.id), pending: clear.isPending },
            ]}
          />
        </div>
      </div>
      {showUrlInput && (
        <div className="flex flex-col gap-2 px-4 py-2 bg-muted/20 sm:flex-row sm:items-center">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }}
            placeholder="Deezer or YouTube link for this track"
            className="md:h-8 md:text-sm"
            autoFocus
          />
          <Button
            size="sm"
            onClick={submitUrl}
            disabled={retryWithUrl.isPending || !url.trim()}
          >
            <RotateCcw className="size-3.5" /> Try this link
          </Button>
        </div>
      )}
      {expanded && job.error && (
        <div className="px-4 py-2 bg-destructive/5">
          <pre className="text-xs text-destructive/80 whitespace-pre-wrap break-all font-mono leading-relaxed">
            {job.error}
          </pre>
        </div>
      )}
    </div>
  );
}
