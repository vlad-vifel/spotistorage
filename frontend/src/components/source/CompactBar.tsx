import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { DeleteSourceDialog } from "./DeleteSourceDialog";
import { useSourceActions } from "@/hooks/useSourceActions";
import { useDeleteSourceFlow } from "@/hooks/useDeleteSourceFlow";
import { getSourceBadgeVariant, getMissingCount } from "@/lib/status";
import { capitalize, cn } from "@/lib/utils";
import type { Source, RefreshResult } from "@/api/types";

interface Props {
  compact: boolean;
  source: Source;
  onRefreshed?: (result: RefreshResult) => void;
}

export function CompactBar({ compact, source, onRefreshed }: Props) {
  const actions = useSourceActions(source.id);
  const deleteFlow = useDeleteSourceFlow(source, actions.deleteSource, { navigateAway: true });
  const missing = getMissingCount(source);
  const badgeVariant = getSourceBadgeVariant(source.downloaded_tracks, source.total_tracks);
  const typeLabel = capitalize(source.type);

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 overflow-hidden transition-[height] duration-150",
        compact ? "h-12" : "h-0"
      )}>
        <SourceArtwork url={source.artwork_url} name={source.name} className="size-8 rounded shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-none mb-0.5">{typeLabel}</p>
          <p className="text-sm font-semibold truncate">{source.name}</p>
        </div>
        <Badge variant={badgeVariant} className="shrink-0 tabular-nums">
          {source.downloaded_tracks}/{source.total_tracks}
        </Badge>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => actions.refresh.mutate(source.id, { onSuccess: onRefreshed })}
            disabled={actions.refresh.isPending || actions.locked}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-3.5", actions.refresh.isPending && "animate-spin")} />
          </Button>
          {(missing > 0 || actions.isDownloading) && (
            <Button
              size="icon-sm"
              onClick={() => actions.download.mutate(source.id)}
              disabled={actions.locked}
              aria-label="Download missing"
            >
              {actions.isDownloading
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Download className="size-3.5" />}
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon-sm"
            onClick={deleteFlow.openDelete}
            disabled={actions.deleteSource.isPending || actions.locked}
            aria-label="Delete source"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <DeleteSourceDialog
        source={source}
        open={deleteFlow.open}
        onOpenChange={deleteFlow.setOpen}
        onConfirm={deleteFlow.confirm}
        isPending={actions.deleteSource.isPending}
      />
    </>
  );
}
