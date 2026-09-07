import { ArrowUpRight } from "lucide-react";
import { useSourceActions } from "@/hooks/useSourceActions";
import { useDeleteSourceFlow } from "@/hooks/useDeleteSourceFlow";
import { DeleteSourceDialog } from "./DeleteSourceDialog";
import { SourceActions } from "./SourceActions";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSourceBadgeVariant } from "@/lib/status";
import { capitalize, formatLocalTime } from "@/lib/utils";
import { showInfo } from "@/lib/toast";
import type { Source, RefreshResult } from "@/api/types";

interface Props {
  source: Source;
  onRefreshed?: (result: RefreshResult) => void;
}

export function SourceHeader({ source, onRefreshed }: Props) {
  const actions = useSourceActions(source.id);
  const deleteFlow = useDeleteSourceFlow(source, actions.deleteSource, { navigateAway: true });
  const badgeVariant = getSourceBadgeVariant(source.downloaded_tracks, source.total_tracks);
  const typeLabel = capitalize(source.type);

  return (
    <>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6 mb-2 md:mb-4">
        <SourceArtwork
          url={source.artwork_url}
          name={source.name}
          className="w-60 h-60 ring-2 sm:w-44 sm:h-44 sm:ring-1 rounded-lg shrink-0 ring-foreground/10"
        />
        <div className="flex flex-col items-start justify-end min-w-0 w-full flex-1">
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
            {source.last_refreshed && (
              <span className="text-xs text-muted-foreground rounded-full border border-border/50 bg-card px-2.5 py-1 shrink-0">
                Last refreshed {formatLocalTime(source.last_refreshed)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0 mt-0.5 min-w-0">
            <h1 className="text-2xl font-semibold line-clamp-2 md:truncate">{source.name}</h1>
            {source.spotify_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" className="text-muted-foreground shrink-0" asChild>
                    <a href={source.spotify_url} target="_blank" rel="noreferrer" aria-label="Open on Spotify">
                      <ArrowUpRight className="size-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open on Spotify</TooltipContent>
              </Tooltip>
            )}
          </div>
          {source.folder_path && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => showInfo(source.folder_path!)}
                  className="max-md:hidden text-xs text-muted-foreground font-mono truncate w-fit max-w-full text-left mt-1"
                >
                  {source.folder_path}
                </button>
              </TooltipTrigger>
              <TooltipContent>{source.folder_path}</TooltipContent>
            </Tooltip>
          )}
          <Badge variant={badgeVariant} className="w-fit mt-2">
            {source.downloaded_tracks}/{source.total_tracks} downloaded
          </Badge>
          <div className="mt-auto pt-3 w-full">
            <SourceActions
              source={source}
              actions={actions}
              size="sm"
              onRefreshed={onRefreshed}
              onDeleteClick={deleteFlow.openDelete}
            />
          </div>
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
