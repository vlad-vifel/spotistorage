import { useState } from "react";
import { RefreshCw, Download, Loader2, Eraser } from "lucide-react";
import { useRefreshAllSources, useDownloadAllMissing, useDeleteAllRemovedTracks } from "@/hooks/useSources";
import { useDownloads } from "@/hooks/useDownloads";
import { DeleteRemovedDialog } from "@/components/source/DeleteRemovedDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRemovedCount, getSourceBadgeVariant } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Source } from "@/api/types";

export function LibraryHeader({ sources }: { sources: Source[] }) {
  const { active, summary } = useDownloads();
  const refreshAll = useRefreshAllSources();
  const downloadAll = useDownloadAllMissing();
  const deleteRemoved = useDeleteAllRemovedTracks();
  const [removedOpen, setRemovedOpen] = useState(false);

  const totalTracks = sources.reduce((sum, s) => sum + s.total_tracks, 0);
  const downloadedTracks = sources.reduce((sum, s) => sum + s.downloaded_tracks, 0);
  const removedTracks = sources.reduce((sum, s) => sum + getRemovedCount(s), 0);
  const notDownloaded = totalTracks - downloadedTracks;
  const badgeVariant = sources.length > 0 ? getSourceBadgeVariant(downloadedTracks, totalTracks) : "outline";
  const isDownloading = downloadAll.isPending || !!summary?.active || active.length > 0;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold">Library</h2>
        {totalTracks > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={badgeVariant} className="tabular-nums">
              {downloadedTracks}/{totalTracks} downloaded
            </Badge>
            {removedTracks > 0 && (
              <Badge variant="muted" className="tabular-nums">
                {removedTracks} no longer on Spotify
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">Your Spotify playlists and albums</p>
        )}
      </div>
      {sources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="max-md:flex-1"
            onClick={() => downloadAll.mutate()}
            disabled={isDownloading || notDownloaded === 0}
          >
            {isDownloading ? (
              <><Loader2 className="size-3.5 animate-spin" /> Downloading</>
            ) : (
              <><Download className="size-3.5" /> Download{notDownloaded > 0 ? ` (${notDownloaded})` : ""}</>
            )}
          </Button>
          {removedTracks > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="max-md:flex-1 max-sm:order-last max-sm:basis-full"
              onClick={() => setRemovedOpen(true)}
              disabled={deleteRemoved.isPending || isDownloading || refreshAll.isPending}
            >
              {deleteRemoved.isPending
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Eraser className="size-3.5" />}
              Delete removed ({removedTracks})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={cn("max-md:flex-1", removedTracks > 0 && "max-sm:flex-none max-sm:size-10 max-sm:px-0")}
            onClick={() => refreshAll.mutate()}
            disabled={refreshAll.isPending}
            aria-label="Refresh all"
          >
            <RefreshCw className={cn("size-3.5", refreshAll.isPending && "animate-spin")} />
            <span className={cn(removedTracks > 0 && "max-sm:hidden")}>Refresh all</span>
          </Button>
        </div>
      )}

      <DeleteRemovedDialog
        count={removedTracks}
        scope="your playlists and albums"
        open={removedOpen}
        onOpenChange={setRemovedOpen}
        onConfirm={() => deleteRemoved.mutate(undefined, { onSuccess: () => setRemovedOpen(false) })}
        isPending={deleteRemoved.isPending}
      />
    </div>
  );
}
