import { ArrowUpRight } from "lucide-react";
import { useSourceActions } from "@/hooks/useSourceActions";
import { useDeleteSourceFlow } from "@/hooks/useDeleteSourceFlow";
import { useDeleteRemovedFlow } from "@/hooks/useDeleteRemovedFlow";
import { DeleteSourceDialog } from "./DeleteSourceDialog";
import { DeleteRemovedDialog } from "./DeleteRemovedDialog";
import { SourceActions } from "./SourceActions";
import { SourceBadges } from "./SourceBadges";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const removedFlow = useDeleteRemovedFlow(source);
  const typeLabel = capitalize(source.type);

  return (
    <>
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-stretch lg:gap-6 mb-2 md:mb-4">
        <SourceArtwork
          url={source.artwork_url}
          name={source.name}
          className="size-60 ring-2 md:size-40 lg:size-44 md:ring-1 rounded-lg shrink-0 ring-foreground/10"
        />
        <div className="flex flex-col items-start min-w-0 w-full flex-1">
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
            {source.last_refreshed && (
              <span className="text-xs text-muted-foreground rounded-full border border-border/50 bg-card px-2.5 py-1 shrink-0">
                Last refreshed {formatLocalTime(source.last_refreshed)}
              </span>
            )}
          </div>
          <div className="flex items-start gap-1 mt-0.5 w-full min-w-0">
            <h1 className="text-2xl font-semibold min-w-0 line-clamp-2 md:line-clamp-1 break-words">{source.name}</h1>
            {source.spotify_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" className="text-muted-foreground shrink-0 mt-1" asChild>
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
                  className="max-lg:hidden text-xs text-muted-foreground font-mono truncate w-fit max-w-full text-left mt-1"
                >
                  {source.folder_path}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md break-all">{source.folder_path}</TooltipContent>
            </Tooltip>
          )}
          <SourceBadges source={source} className="mt-2" />
          <div className="mt-auto pt-3 w-full">
            <SourceActions
              source={source}
              actions={actions}
              variant="header"
              onRefreshed={onRefreshed}
              onDeleteClick={deleteFlow.openDelete}
              onDeleteRemovedClick={removedFlow.openDialog}
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
      <DeleteRemovedDialog
        count={removedFlow.count}
        scope={`"${source.name}"`}
        open={removedFlow.open}
        onOpenChange={removedFlow.setOpen}
        onConfirm={removedFlow.confirm}
        isPending={removedFlow.isPending}
      />
    </>
  );
}
