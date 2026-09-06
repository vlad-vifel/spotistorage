import { useState } from "react";
import { useAddSource, useDownloadSource } from "./useSources";
import type { Source } from "@/api/types";

export function useAddAndDownload(onAdded?: (source: Source) => void) {
  const addSource = useAddSource();
  const downloadSource = useDownloadSource();
  const [pendingAction, setPendingAction] = useState<"add" | "addAndDownload" | null>(null);

  const handleAdd = (url: string) => {
    setPendingAction("add");
    addSource.mutate(url, {
      onSuccess: onAdded,
      onSettled: () => setPendingAction(null),
    });
  };

  const handleAddAndDownload = (url: string) => {
    setPendingAction("addAndDownload");
    addSource.mutate(url, {
      onSuccess: (source) => {
        downloadSource.mutate(source.id);
        onAdded?.(source);
      },
      onSettled: () => setPendingAction(null),
    });
  };

  return { handleAdd, handleAddAndDownload, pendingAction };
}
