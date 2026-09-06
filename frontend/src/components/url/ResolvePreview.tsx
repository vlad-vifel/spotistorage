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
      contentClassName="p-5"
      artworkUrl={result.artwork_url}
      artworkName={result.name}
      artworkClassName="h-auto aspect-square object-cover shrink-0 self-stretch min-w-28"
      artworkIconClassName="size-9"
      artworkStyle={{ maxWidth: "10rem" }}
    >
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{typeLabel}</p>
        <h2 className="text-lg font-semibold truncate">{result.name}</h2>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {pluralize(result.total_tracks, "track")}
          </span>
          {result.already_in_library && (
            <Badge variant="info">Already in library</Badge>
          )}
          {result.already_in_library && result.downloaded_tracks > 0 && (
            <Badge variant="success">{result.downloaded_tracks} downloaded</Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {result.already_in_library ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(libraryPath)}
          >
            Open in library
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onAdd} disabled={isPending}>
              Add to library
            </Button>
            <Button size="sm" onClick={onAddAndDownload} disabled={isPending}>
              {pendingAction === "addAndDownload" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Add &amp; Download
            </Button>
          </>
        )}
      </div>
    </MediaCard>
  );
}
