import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { useSource } from "@/hooks/useSources";
import { useCompactHeader } from "@/hooks/useCompactHeader";
import { useTrackSortFilter } from "@/hooks/useTrackSortFilter";
import { SourceHeader } from "@/components/source/SourceHeader";
import { CompactBar } from "@/components/source/CompactBar";
import { RefreshBanner } from "@/components/source/RefreshBanner";
import { TrackTable } from "@/components/source/TrackTable";
import { TrackTableHeader } from "@/components/source/TrackTableHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { CenteredSpinner } from "@/components/common/CenteredSpinner";
import { ActionMenu } from "@/components/common/ActionMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RefreshResult, Source } from "@/api/types";

function SourcePageLoaded({ source }: { source: Source }) {
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);
  const [search, setSearch] = useState("");
  const { compact, headerRef } = useCompactHeader();
  const { filtered, sortKey, sortDir, toggleSort } = useTrackSortFilter(source.tracks, search);

  const total = source.tracks?.length ?? 0;

  return (
    <div className="flex flex-col pb-6">
      <div ref={headerRef} className="pt-6 mb-2 md:mb-4">
        <SourceHeader source={source} onRefreshed={setRefreshResult} />
        {refreshResult && (
          <RefreshBanner result={refreshResult} onDismiss={() => setRefreshResult(null)} />
        )}
      </div>

      <div className="flex items-center justify-between gap-4 py-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {filtered.length === total
            ? `${total} track${total === 1 ? "" : "s"}`
            : `${filtered.length} of ${total} tracks`}
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search title or artist"
            className="flex-1 sm:w-48"
          />
          <ActionMenu
            className="md:hidden"
            icon={ArrowUpDown}
            label="Sort by"
            items={[
              { label: sortKey === "position" ? `Position ${sortDir === "desc" ? "↑" : "↓"}` : "Position", onSelect: () => toggleSort("position") },
              { label: sortKey === "status" ? `Status ${sortDir === "desc" ? "↑" : "↓"}` : "Status", onSelect: () => toggleSort("status") },
            ]}
          />
        </div>
      </div>

      <div className={cn("sticky top-0 z-20 bg-background page-bleed", compact && "border-b border-border/30")}>
        <CompactBar compact={compact} source={source} onRefreshed={setRefreshResult} />
        <TrackTableHeader sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
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
