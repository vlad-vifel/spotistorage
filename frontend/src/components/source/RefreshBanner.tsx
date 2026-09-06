import { X } from "lucide-react";
import { pluralize } from "@/lib/utils";
import type { RefreshResult } from "@/api/types";

interface Props {
  result: RefreshResult;
  onDismiss: () => void;
}

export function RefreshBanner({ result, onDismiss }: Props) {
  const parts: string[] = [];
  if (result.new > 0) parts.push(pluralize(result.new, "new track", "new tracks"));
  if (result.missing > 0) parts.push(`${result.missing} not yet downloaded`);
  if (result.removed_from_source > 0) parts.push(`${result.removed_from_source} removed from source`);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/50 px-4 py-2.5 text-sm mt-3">
      <span className="flex-1 text-muted-foreground">{parts.join(" · ")}</span>
      <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={onDismiss} aria-label="Dismiss">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
