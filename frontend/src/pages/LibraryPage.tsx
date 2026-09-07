import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ListMusic, Disc, RefreshCw, Download, Loader2 } from "lucide-react";
import { useSources, useRefreshAllSources, useDownloadAllMissing } from "@/hooks/useSources";
import { useDownloads } from "@/hooks/useDownloads";
import { SourceList } from "@/components/library/SourceList";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { CenteredSpinner } from "@/components/common/CenteredSpinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSourceBadgeVariant } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { SourceType } from "@/api/types";

const TABS: { value: SourceType; label: string }[] = [
  { value: "playlist", label: "Playlists" },
  { value: "album", label: "Albums" },
];

const TAB_EMPTY: Record<string, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
  playlist: { icon: ListMusic, title: "No playlists yet", description: "Add a Spotify playlist to get started." },
  album: { icon: Disc, title: "No albums yet", description: "Add a Spotify album to get started." },
};

export function LibraryPage() {
  const { data: sources = [], isLoading } = useSources();
  const { active } = useDownloads();
  const refreshAll = useRefreshAllSources();
  const downloadAll = useDownloadAllMissing();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SourceType>("playlist");
  const [search, setSearch] = useState("");

  const filtered = sources.filter((s) => {
    if (s.type !== tab) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalTracks = sources.reduce((sum, s) => sum + s.total_tracks, 0);
  const downloadedTracks = sources.reduce((sum, s) => sum + s.downloaded_tracks, 0);
  const notDownloaded = totalTracks - downloadedTracks;
  const badgeVariant = sources.length > 0 ? getSourceBadgeVariant(downloadedTracks, totalTracks) : "outline";
  const isDownloading = active.length > 0 || downloadAll.isPending;

  const addButton = (
    <Button size="sm" onClick={() => navigate("/add")}>
      <Plus className="size-4" /> Add from Spotify
    </Button>
  );

  const emptyInfo = TAB_EMPTY[tab];

  return (
    <div className="flex flex-col gap-6 pt-6 pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Library</h2>
            {totalTracks > 0 ? (
              <div className="mt-1">
                <Badge variant={badgeVariant} className="tabular-nums">
                  {downloadedTracks}/{totalTracks} downloaded
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">Your Spotify playlists and albums</p>
            )}
          </div>
          {sources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="max-md:flex-1"
                onClick={() => refreshAll.mutate()}
                disabled={refreshAll.isPending}
              >
                <RefreshCw className={cn("size-3.5", refreshAll.isPending && "animate-spin")} />
                Refresh all
              </Button>
              <Button
                size="sm"
                className="max-md:flex-1"
                onClick={() => downloadAll.mutate()}
                disabled={isDownloading || notDownloaded === 0}
              >
                {downloadAll.isPending
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Download className="size-3.5" />}
                <span className="md:hidden">Download{notDownloaded > 0 ? ` (${notDownloaded})` : ""}</span>
                <span className="max-md:hidden">Download missing{notDownloaded > 0 ? ` (${notDownloaded})` : ""}</span>
              </Button>
            </div>
          )}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="w-full sm:w-48 self-start"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SourceType)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <CenteredSpinner />
      ) : filtered.length === 0 && search ? (
        <EmptyState
          icon={Search}
          title={`No results for "${search}"`}
          description="Try adjusting your search."
        />
      ) : filtered.length === 0 && emptyInfo ? (
        <EmptyState
          icon={emptyInfo.icon}
          title={emptyInfo.title}
          description={emptyInfo.description}
          action={addButton}
        />
      ) : (
        <SourceList sources={filtered} />
      )}
    </div>
  );
}
