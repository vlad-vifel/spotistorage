import { Badge } from "@/components/ui/badge";
import { getRemovedCount, getSourceBadgeVariant } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Source } from "@/api/types";

interface Props {
  source: Source;
  className?: string;
}

export function SourceBadges({ source, className }: Props) {
  const removed = getRemovedCount(source);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge variant={getSourceBadgeVariant(source.downloaded_tracks, source.total_tracks)} className="tabular-nums">
        {source.downloaded_tracks}/{source.total_tracks} downloaded
      </Badge>
      {removed > 0 && (
        <Badge variant="muted" className="tabular-nums">
          {removed} no longer in {source.type}
        </Badge>
      )}
    </div>
  );
}
