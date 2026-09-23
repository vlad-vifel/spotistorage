import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDownloadSummary } from "./useDownloads";
import { isAndroid, startDownloadService } from "@/lib/androidBridge";

export type LastBatch = { done: number; failed: number; cancelled: number } | null;

export function useDownloadNotifications() {
  const { data: summary } = useDownloadSummary();
  const wasActiveRef = useRef(false);
  const [lastBatch, setLastBatch] = useState<LastBatch>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const isActive = summary?.active ?? false;
    const wasActive = wasActiveRef.current;

    if (isActive && !wasActive) {
      setLastBatch(null);
      if (isAndroid()) startDownloadService();
    }

    if (wasActive && !isActive) {
      qc.invalidateQueries({ queryKey: ["sources"] });
      const doneCount = summary?.done ?? 0;
      const failedCount = summary?.failed ?? 0;
      const cancelledCount = summary?.cancelled ?? 0;

      if (doneCount > 0 || failedCount > 0 || cancelledCount > 0) {
        setLastBatch({ done: doneCount, failed: failedCount, cancelled: cancelledCount });

        if (failedCount === 0 && cancelledCount === 0) {
          toast.success(`Downloaded ${doneCount} track${doneCount === 1 ? "" : "s"}`);
        } else {
          const parts = [`Downloaded ${doneCount} track${doneCount === 1 ? "" : "s"}`];
          if (failedCount) parts.push(`${failedCount} failed`);
          if (cancelledCount) parts.push(`${cancelledCount} cancelled`);
          toast.warning(parts.join(" · "));
        }
      }
    }

    wasActiveRef.current = isActive;
  }, [summary?.active, summary?.batch_id, summary?.done, summary?.failed, summary?.cancelled]);

  return { lastBatch, clearLastBatch: () => setLastBatch(null) };
}
