import { RefreshCw, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMissingCount } from "@/lib/status";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import type { Source, RefreshResult } from "@/api/types";
import type { useSourceActions } from "@/hooks/useSourceActions";

type Actions = ReturnType<typeof useSourceActions>;

interface Props {
  source: Source;
  actions: Actions;
  size: "xs" | "sm";
  onRefreshed?: (result: RefreshResult) => void;
  onDeleteClick: () => void;
}

export function SourceActions({ source, actions, size, onRefreshed, onDeleteClick }: Props) {
  const { download, refresh, deleteSource, isDownloading, locked } = actions;
  const isMobile = useIsMobile();
  const missing = getMissingCount(source);
  const iconSize = size === "xs" ? "size-3" : "size-3.5";
  const iconButtonSize = size === "xs" ? "icon-xs" : "icon-sm";
  const hasDownload = missing > 0 || isDownloading;

  const downloadButton = (
    <Button size={size} className={isMobile ? "flex-1" : undefined} onClick={() => download.mutate(source.id)} disabled={locked}>
      {isDownloading ? (
        <><Loader2 className={`${iconSize} animate-spin`} /> Downloading</>
      ) : (
        <><Download className={iconSize} /> Download missing ({missing})</>
      )}
    </Button>
  );

  const refreshIcon = <RefreshCw className={cn(iconSize, refresh.isPending && "animate-spin")} />;

  const refreshButton = (asIcon: boolean) =>
    asIcon ? (
      <Button
        variant="outline"
        size={iconButtonSize}
        className="shrink-0 max-md:size-10"
        onClick={() => refresh.mutate(source.id, { onSuccess: onRefreshed })}
        disabled={refresh.isPending || locked}
        aria-label="Refresh"
      >
        {refreshIcon}
      </Button>
    ) : (
      <Button
        variant="outline"
        size={size}
        className={isMobile ? "flex-1" : undefined}
        onClick={() => refresh.mutate(source.id, { onSuccess: onRefreshed })}
        disabled={refresh.isPending || locked}
      >
        {refreshIcon} Refresh
      </Button>
    );

  if (!isMobile) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {refreshButton(false)}
        {hasDownload && downloadButton}
        <Button variant="destructive" size={size} onClick={onDeleteClick} disabled={deleteSource.isPending || locked}>
          <Trash2 className={iconSize} />
          Delete {source.type}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {hasDownload ? (
        <>
          {downloadButton}
          {refreshButton(true)}
        </>
      ) : (
        refreshButton(false)
      )}
      <Button
        variant="destructive"
        size={iconButtonSize}
        className="shrink-0 max-md:size-10"
        onClick={onDeleteClick}
        disabled={deleteSource.isPending || locked}
        aria-label={`Delete ${source.type}`}
      >
        <Trash2 className={iconSize} />
      </Button>
    </div>
  );
}
