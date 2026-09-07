import { CheckCircle2, Copy, RotateCcw, X } from "lucide-react";
import {
  useDownloads, useRetryAllFailed, useClearAllFailed,
} from "@/hooks/useDownloads";
import { useSources } from "@/hooks/useSources";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorRow } from "@/components/errors/ErrorRow";
import { Button } from "@/components/ui/button";

export function ErrorsPage() {
  const { failed } = useDownloads();
  const { data: sources = [] } = useSources();
  const retryAll = useRetryAllFailed();
  const clearAll = useClearAllFailed();
  const { copied, copy } = useCopyToClipboard(2000);

  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? id;

  const handleCopyErrors = () => {
    const text = failed
      .map((j, i) => {
        const label = `${j.track_artist ? `${j.track_artist} – ` : ""}${j.track_title}`;
        return `${i + 1}. ${label}\n   ${j.error ?? "Unknown error"}`;
      })
      .join("\n\n");
    copy(text);
  };

  return (
    <div className="flex flex-col gap-4 pt-6 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Failed downloads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {failed.length > 0
              ? `${failed.length} track${failed.length === 1 ? "" : "s"} failed across your library`
              : "Nothing to retry right now"}
          </p>
        </div>
        {failed.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="max-md:hidden" onClick={handleCopyErrors}>
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy errors"}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="md:hidden shrink-0"
              onClick={handleCopyErrors}
              aria-label={copied ? "Copied" : "Copy errors"}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="max-md:flex-1"
              onClick={() => retryAll.mutate(failed.map((j) => j.id))}
              disabled={retryAll.isPending}
            >
              <RotateCcw className="size-3.5" /> Retry all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="max-md:flex-1"
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
