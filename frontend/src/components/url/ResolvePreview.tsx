import { useNavigate } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaCard } from "@/components/common/MediaCard";
import { capitalize, pluralize } from "@/lib/utils";
import type { ResolveResult } from "@/api/types";

interface Props {
  result: ResolveResult;
  onAdd: () => void;
  onAddAndDownload: () => void;
  pendingAction: "add" | "addAndDownload" | null;
}

export function ResolvePreview({ result, onAdd, onAddAndDownload, pendingAction }: Props) {
  const navigate = useNavigate();
  const typeLabel = capitalize(result.type);
  const isPending = pendingAction !== null;

  const libraryPath = result.type === "track" ? "/library/tracks" : `/library/${result.spotify_id}`;

  return (
    <MediaCard
      className="mt-6"
      contentClassName="md:p-5"
      artworkUrl={result.artwork_url}
      artworkName={result.name}
      artworkClassName="object-cover shrink-0 max-md:size-20 max-md:rounded-md max-md:ring-1 max-md:ring-input md:size-36"
      artworkIconClassName="size-9"
      actions={
        result.already_in_library ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate(libraryPath)}
          >
            Open in library
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onAdd} disabled={isPending}>
              Add to library
            </Button>
            <Button size="sm" className="flex-1" onClick={onAddAndDownload} disabled={isPending}>
              {pendingAction === "addAndDownload" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Add &amp; Download
            </Button>
          </div>
        )
      }
    >
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{typeLabel}</p>
        <h2 className="text-lg font-semibold truncate">
          {result.name}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({pluralize(result.total_tracks, "track")})
          </span>
        </h2>
        {result.already_in_library && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="info">Already in library</Badge>
          </div>
        )}
      </div>
    </MediaCard>
  );
}
