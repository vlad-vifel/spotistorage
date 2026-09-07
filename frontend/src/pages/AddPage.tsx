import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { useResolveUrl } from "@/hooks/useSources";
import { useAddAndDownload } from "@/hooks/useAddAndDownload";
import { ResolvePreview } from "@/components/url/ResolvePreview";
import { UserProfilePreview } from "@/components/url/UserProfilePreview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResolveResult, UserResolveResult } from "@/api/types";

function isSpotifyUrl(value: string) {
  return value.includes("spotify.com") || value.startsWith("spotify:");
}

export function AddPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const resolve = useResolveUrl();
  const { handleAdd: addUrl, handleAddAndDownload: addAndDownloadUrl, pendingAction } =
    useAddAndDownload((source) => navigate(`/library/${source.id}`));

  const trimmed = url.trim();
  const invalidUrl = trimmed.length > 0 && !isSpotifyUrl(trimmed);

  const handleResolve = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || invalidUrl) return;
    resolve.mutate(trimmed);
  };

  const handleAdd = () => {
    if (!resolve.data) return;
    addUrl(trimmed);
  };

  const handleAddAndDownload = () => {
    if (!resolve.data) return;
    addAndDownloadUrl(trimmed);
  };

  return (
    <div className="max-w-2xl pt-6 pb-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Add from Spotify</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Paste a playlist, album, track, or user profile URL</p>
      </div>

      <form onSubmit={handleResolve} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 pr-8"
            placeholder="https://open.spotify.com/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (resolve.data || resolve.isError) resolve.reset();
            }}
            disabled={resolve.isPending}
          />
          {invalidUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <AlertCircle className="size-3.5 text-amber-400" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Doesn't look like a Spotify URL</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Button
          type="submit"
          disabled={!trimmed || invalidUrl || resolve.isPending}
        >
          {resolve.isPending ? (
            <><Loader2 className="size-3.5 animate-spin" /> Resolving</>
          ) : (
            "Resolve"
          )}
        </Button>
      </form>
      {invalidUrl && (
        <p className="md:hidden text-xs text-amber-400 mt-1.5">Doesn't look like a Spotify URL</p>
      )}

      {resolve.data && (
        resolve.data.type === "user" ? (
          <UserProfilePreview result={resolve.data as UserResolveResult} />
        ) : (
          <ResolvePreview
            result={resolve.data as ResolveResult}
            onAdd={handleAdd}
            onAddAndDownload={handleAddAndDownload}
            pendingAction={pendingAction}
          />
        )
      )}
    </div>
  );
}
