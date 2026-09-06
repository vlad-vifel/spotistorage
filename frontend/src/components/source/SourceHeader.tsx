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
      <div className="relative flex gap-6 mb-4">
        {source.last_refreshed && (
          <span className="absolute top-0 right-0 text-xs text-muted-foreground rounded-full border border-border/50 bg-card px-2.5 py-1">
            Last refreshed {formatLocalTime(source.last_refreshed)}
          </span>
        )}
        <SourceArtwork
          url={source.artwork_url}
          name={source.name}
          className="w-44 h-44 rounded-lg shrink-0 ring-1 ring-foreground/10"
        />
        <div className="flex flex-col justify-end min-w-0">
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <h1 className="text-2xl font-semibold truncate">{source.name}</h1>
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
                <p className="text-xs text-muted-foreground font-mono truncate w-fit max-w-full cursor-default mt-1">
                  {source.folder_path}
                </p>
              </TooltipTrigger>
              <TooltipContent>{source.folder_path}</TooltipContent>
            </Tooltip>
          )}
          <Badge variant={badgeVariant} className="w-fit mt-2">
            {source.downloaded_tracks}/{source.total_tracks} downloaded
          </Badge>
          <div className="mt-auto pt-3">
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
