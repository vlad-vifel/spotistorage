import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ListMusic, Disc } from "lucide-react";
import { useSources } from "@/hooks/useSources";
import { SourceList } from "@/components/library/SourceList";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { CenteredSpinner } from "@/components/common/CenteredSpinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<SourceType>("playlist");
  const [search, setSearch] = useState("");

  const filtered = sources.filter((s) => {
    if (s.type !== tab) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addButton = (
    <Button size="sm" onClick={() => navigate("/add")}>
      <Plus className="size-4" /> Add from Spotify
    </Button>
  );

  const emptyInfo = TAB_EMPTY[tab];

  return (
    <div className="flex flex-col gap-6 pt-6 pb-6">
      <LibraryHeader sources={sources} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="w-full sm:order-last sm:w-56"
        />
        <Tabs value={tab} onValueChange={(v) => setTab(v as SourceType)}>
          <TabsList className="sm:border-b-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

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
