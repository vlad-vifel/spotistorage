import { RefreshCw, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMissingCount } from "@/lib/status";
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
  const missing = getMissingCount(source);
  const iconSize = size === "xs" ? "size-3" : "size-3.5";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        variant="outline"
        size={size}
        onClick={() => refresh.mutate(source.id, { onSuccess: onRefreshed })}
        disabled={refresh.isPending || locked}
      >
        <RefreshCw className={`${iconSize} ${refresh.isPending ? "animate-spin" : ""}`} />
        Refresh
      </Button>

      {(missing > 0 || isDownloading) && (
        <Button
          size={size}
          onClick={() => download.mutate(source.id)}
          disabled={locked}
        >
          {isDownloading ? (
            <><Loader2 className={`${iconSize} animate-spin`} /> Downloading</>
          ) : (
            <><Download className={iconSize} /> Download missing ({missing})</>
          )}
        </Button>
      )}

      <Button
        variant="destructive"
        size={size}
        onClick={onDeleteClick}
        disabled={deleteSource.isPending || locked}
      >
        <Trash2 className={iconSize} />
        Delete {source.type}
      </Button>
    </div>
  );
}
