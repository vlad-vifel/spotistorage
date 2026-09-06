import { Link } from "react-router-dom";
import { useSourceActions } from "@/hooks/useSourceActions";
import { useDeleteSourceFlow } from "@/hooks/useDeleteSourceFlow";
import { DeleteSourceDialog } from "@/components/source/DeleteSourceDialog";
import { SourceActions } from "@/components/source/SourceActions";
import { MediaCard } from "@/components/common/MediaCard";
import { Badge } from "@/components/ui/badge";
import { getSourceBadgeVariant } from "@/lib/status";
import { formatLocalTime } from "@/lib/utils";
import type { Source } from "@/api/types";

interface Props {
  source: Source;
}

export function SourceCard({ source }: Props) {
  const actions = useSourceActions(source.id);
  const deleteFlow = useDeleteSourceFlow(source, actions.deleteSource);
  const badgeVariant = getSourceBadgeVariant(source.downloaded_tracks, source.total_tracks);

  return (
    <>
      <MediaCard
        className="hover:bg-card/80 transition-colors"
        artworkHref={`/library/${source.id}`}
        artworkClassName="shrink-0 w-34 h-34 self-start"
        artworkUrl={source.artwork_url}
        artworkName={source.name}
        contentClassName="p-3"
      >
        <Link to={`/library/${source.id}`} className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
            {source.last_refreshed && (
              <p className="text-xs text-muted-foreground shrink-0">
                Last refreshed {formatLocalTime(source.last_refreshed)}
              </p>
            )}
          </div>
          <p className="font-semibold truncate mt-0.5">{source.name}</p>
          <Badge variant={badgeVariant} className="w-fit flex items-center gap-2 mt-1.5">
            {source.downloaded_tracks}/{source.total_tracks} downloaded
          </Badge>
        </Link>

        <div className="mt-3">
          <SourceActions
            source={source}
            actions={actions}
            size="xs"
            onDeleteClick={deleteFlow.openDelete}
          />
        </div>
      </MediaCard>

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
