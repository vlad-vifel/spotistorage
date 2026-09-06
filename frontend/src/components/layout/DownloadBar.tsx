import { useState } from "react";
import { ChevronUp, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { useDownloads } from "@/hooks/useDownloads";
import { DownloadPanel } from "./DownloadPanel";
import { Progress } from "@/components/ui/progress";

export function DownloadBar() {
  const { active, failed, done } = useDownloads();
  const [expanded, setExpanded] = useState(false);

  const visible = active.length > 0 || failed.length > 0;
  if (!visible) return null;

  const batchTotal = active.length + done.length;
  const progressPct = batchTotal > 0 ? (done.length / batchTotal) * 100 : 0;

  return (
    <div className="border-t border-border/50">
      {expanded && <DownloadPanel onClose={() => setExpanded(false)} />}
      <button
        className="w-full hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Collapse download queue" : "Expand download queue"}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 px-6 py-2">
          {active.length > 0 && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
          )}
          <Progress value={progressPct} className="flex-1 h-1" />
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {done.length}/{batchTotal}
            </span>
            {failed.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" />
                {failed.length}
              </span>
            )}
            {expanded
              ? <ChevronDown className="size-3.5 text-muted-foreground" />
              : <ChevronUp className="size-3.5 text-muted-foreground" />}
          </div>
        </div>
      </button>
    </div>
  );
}
