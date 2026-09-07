import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortKey, SortDir } from "@/hooks/useTrackSortFilter";
import { cn } from "@/lib/utils";
import { TRACK_ROW, COL_POSITION, COL_STATUS, COL_ACTION } from "./trackColumns";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="size-3 opacity-40" />;
  return sortDir === "asc" ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />;
}

interface Props {
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
}

export function TrackTableHeader({ sortKey, sortDir, onToggle }: Props) {
  return (
    <div className={cn(TRACK_ROW, "max-md:hidden py-1.5 border-b border-border/50")}>
      <button
        onClick={() => onToggle("position")}
        className={cn(COL_POSITION, "gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors")}
      >
        # <SortIcon col="position" sortKey={sortKey} sortDir={sortDir} />
      </button>
      <span className="text-xs text-muted-foreground flex-1">Title</span>
      <button
        onClick={() => onToggle("status")}
        className={cn(COL_STATUS, "gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors")}
      >
        Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
      </button>
      <span className={cn(COL_ACTION, "text-xs text-muted-foreground")}>Action</span>
    </div>
  );
}
