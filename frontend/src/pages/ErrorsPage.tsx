import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Link2, RotateCcw, X } from "lucide-react";
import {
  useDownloads, useRetryDownload, useRetryWithUrl, useRetryAllFailed,
  useCancelDownload, useClearAllFailed,
} from "@/hooks/useDownloads";
import { useSources } from "@/hooks/useSources";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError } from "@/lib/toast";
import type { DownloadJob } from "@/api/types";

function ErrorRow({ job, sourceName }: { job: DownloadJob; sourceName: string }) {
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
      <div className="flex items-center gap-3 px-4 py-3">
        <AlertCircle className="size-4 text-destructive shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">
            {job.track_artist && <span>{job.track_artist} – </span>}
            {job.track_title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            <Link to={`/library/${job.source_id}`} className="hover:underline">{sourceName}</Link>
            {job.error && !expanded && ` · ${job.error}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>
      {showUrlInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); }}
            placeholder="Deezer or YouTube link for this track"
            className="h-8 text-sm"
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

export function ErrorsPage() {
  const { failed } = useDownloads();
  const { data: sources = [] } = useSources();
  const retryAll = useRetryAllFailed();
  const clearAll = useClearAllFailed();
  const [copied, setCopied] = useState(false);

  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? id;

  const handleCopyErrors = () => {
    const text = failed
      .map((j, i) => {
        const label = `${j.track_artist ? `${j.track_artist} – ` : ""}${j.track_title}`;
        return `${i + 1}. ${label}\n   ${j.error ?? "Unknown error"}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (e) => showError(e, "Could not copy to clipboard")
    );
  };

  return (
    <div className="flex flex-col gap-4 pt-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Failed downloads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {failed.length > 0
              ? `${failed.length} track${failed.length === 1 ? "" : "s"} failed across your library`
              : "Nothing to retry right now"}
          </p>
        </div>
        {failed.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyErrors}>
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy errors"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryAll.mutate(failed.map((j) => j.id))}
              disabled={retryAll.isPending}
            >
              <RotateCcw className="size-3.5" /> Retry all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <X className="size-3.5" /> Clear all
            </Button>
          </div>
        )}
      </div>

      {failed.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No failed downloads"
          description="Everything that was queued downloaded successfully."
        />
      ) : (
        <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
          {failed.map((job) => (
            <ErrorRow key={job.id} job={job} sourceName={sourceName(job.source_id)} />
          ))}
        </div>
      )}
    </div>
  );
}
