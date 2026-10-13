import { useState } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";

const DISMISSED_KEY = "dismissedUpdateVersion";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function UpdatePill() {
  const update = useAppUpdate();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!update?.latest_version || dismissed === update.latest_version) return null;

  const dismiss = () => {
    setDismissed(update.latest_version);
    try {
      localStorage.setItem(DISMISSED_KEY, update.latest_version!);
    } catch {
      /* storage unavailable – dismissal lasts for this session only */
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-xs shrink-0">
      <a
        href={update.release_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowUpCircle className="size-3 text-blue-400 shrink-0" />
        v{update.latest_version} available
      </a>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
        onClick={dismiss}
        aria-label="Dismiss update notice"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
