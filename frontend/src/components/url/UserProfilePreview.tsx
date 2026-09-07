import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { MediaCard } from "@/components/common/MediaCard";
import { useSources } from "@/hooks/useSources";
import { useAddAndDownload } from "@/hooks/useAddAndDownload";
import { pluralize } from "@/lib/utils";
import type { UserPlaylist, UserResolveResult } from "@/api/types";

function PlaylistCard({ playlist }: { playlist: UserPlaylist }) {
  const navigate = useNavigate();
  const { data: sources } = useSources();
  const [justAdded, setJustAdded] = useState(false);
  const { handleAdd, handleAddAndDownload, pendingAction } = useAddAndDownload(() => setJustAdded(true));

  const existingSource = sources?.find((s) => s.spotify_id === playlist.id);
  const inLibrary = !!existingSource || justAdded;
  const sourceId = existingSource?.id ?? playlist.id;
  const isPending = pendingAction !== null;

  return (
    <MediaCard
      contentClassName="md:p-4"
      artworkUrl={playlist.artwork_url}
      artworkName={playlist.name}
      artworkClassName="shrink-0 self-start max-md:size-20 max-md:rounded-md max-md:ring-1 max-md:ring-input md:w-38 md:h-38"
      artworkIconClassName="size-9"
      actions={
        inLibrary ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/library/${sourceId}`)}>
            Open in library
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAdd(playlist.spotify_url)} disabled={isPending}>
              {pendingAction === "add" && <Loader2 className="size-3.5 animate-spin" />}
              Add to library
            </Button>
            <Button size="sm" className="flex-1" onClick={() => handleAddAndDownload(playlist.spotify_url)} disabled={isPending}>
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
        <p className="text-xs text-muted-foreground mb-0.5">Playlist</p>
        <h2 className="text-lg font-semibold truncate">
          {playlist.name}
          {playlist.total_tracks > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}({pluralize(playlist.total_tracks, "track")})
            </span>
          )}
        </h2>
        {inLibrary && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="success">Added</Badge>
          </div>
        )}
      </div>
    </MediaCard>
  );
}

interface Props {
  result: UserResolveResult;
}

export function UserProfilePreview({ result }: Props) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
        <SourceArtwork
          url={result.artwork_url}
          name={result.name}
          className="size-10 rounded-full ring-1 ring-foreground/10"
          icon={User}
          iconClassName="size-5"
        />
        <div>
          <p className="font-semibold">{result.name}</p>
          <p className="text-xs text-muted-foreground">
            {pluralize(result.playlists.length, "public playlist", "public playlists")}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {result.playlists.map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}
