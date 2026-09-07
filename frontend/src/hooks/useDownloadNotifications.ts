import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDownloads } from "./useDownloads";

export type LastBatch = { done: number; failed: number } | null;

export function useDownloadNotifications() {
  const { active, done, failed } = useDownloads();
  const wasActiveRef = useRef(false);
  const [lastBatch, setLastBatch] = useState<LastBatch>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const isActive = active.length > 0;
    const wasActive = wasActiveRef.current;

    if (isActive && !wasActive) {
      setLastBatch(null);
    }

    if (wasActive && !isActive) {
      qc.invalidateQueries({ queryKey: ["sources"] });
      const doneCount = done.length;
      const failedCount = failed.length;

      if (doneCount > 0 || failedCount > 0) {
        setLastBatch({ done: doneCount, failed: failedCount });

        if (failedCount === 0) {
          const sourceIds = new Set(done.map((j) => j.source_id));
          const target = sourceIds.size === 1 ? `/library/${[...sourceIds][0]}` : "/library";
          toast.success(`Downloaded ${doneCount} track${doneCount === 1 ? "" : "s"}`, {
            action: { label: "Open", onClick: () => navigate(target) },
          });
        } else {
          toast.warning(
            `Downloaded ${doneCount} track${doneCount === 1 ? "" : "s"} · ${failedCount} failed`,
            { action: { label: "View", onClick: () => navigate("/errors") } }
          );
        }
      }
    }

    wasActiveRef.current = isActive;
  }, [active.length, done.length, failed.length]);

  return { lastBatch, clearLastBatch: () => setLastBatch(null) };
}
