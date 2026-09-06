import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useSource } from "@/hooks/useSources";
import { useCompactHeader } from "@/hooks/useCompactHeader";
import { useTrackSortFilter, type SortKey, type SortDir } from "@/hooks/useTrackSortFilter";
import { SourceHeader } from "@/components/source/SourceHeader";
import { CompactBar } from "@/components/source/CompactBar";
import { RefreshBanner } from "@/components/source/RefreshBanner";
import { TrackTable } from "@/components/source/TrackTable";
import { SearchInput } from "@/components/common/SearchInput";
import { CenteredSpinner } from "@/components/common/CenteredSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RefreshResult, Source } from "@/api/types";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="size-3 opacity-40" />;
  return sortDir === "asc" ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />;
}

function SourcePageLoaded({ source }: { source: Source }) {
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);
  const [search, setSearch] = useState("");
  const { compact, headerRef } = useCompactHeader();
  const { filtered, sortKey, sortDir, toggleSort } = useTrackSortFilter(source.tracks, search);

  const total = source.tracks?.length ?? 0;

  return (
    <div className="flex flex-col pb-6">
      <div ref={headerRef} className="pt-6 mb-4">
        <SourceHeader source={source} onRefreshed={setRefreshResult} />
        {refreshResult && (
          <RefreshBanner result={refreshResult} onDismiss={() => setRefreshResult(null)} />
        )}
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        <span className="text-xs text-muted-foreground">
          {filtered.length === total
            ? `${total} track${total === 1 ? "" : "s"}`
            : `${filtered.length} of ${total} tracks`}
        </span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search title or artist" className="w-56" />
      </div>

      <div className={cn("sticky top-0 z-20 bg-background -mx-6 px-6", compact && "border-b border-border/30")}>
        <CompactBar compact={compact} source={source} onRefreshed={setRefreshResult} />
        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-border/50">
          <button
            onClick={() => toggleSort("position")}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-8 justify-center shrink-0"
          >
            # <SortIcon col="position" sortKey={sortKey} sortDir={sortDir} />
          </button>
          <span className="text-xs text-muted-foreground flex-1">Title</span>
          <button
            onClick={() => toggleSort("status")}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-16 justify-center shrink-0"
          >
            Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
          </button>
          <span className="text-xs text-muted-foreground w-8 text-center shrink-0">Action</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {search ? `No tracks match "${search}"` : "No tracks"}
        </p>
      ) : (
        <TrackTable tracks={filtered} sourceId={source.id} />
      )}
    </div>
  );
}

function SourcePageContent({ id }: { id: string }) {
  const { data: source, isLoading, error } = useSource(id);

  if (isLoading) return <CenteredSpinner />;

  if (error || !source) {
    return (
      <div className="flex flex-col gap-3 pt-6">
        <p className="text-destructive text-sm">Source not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/library">
            <ArrowLeft className="size-3.5" /> Back to library
          </Link>
        </Button>
      </div>
    );
  }

  return <SourcePageLoaded source={source} />;
}

export function SourcePage() {
  const { id } = useParams<{ id: string }>();
  return <SourcePageContent id={id!} />;
}
