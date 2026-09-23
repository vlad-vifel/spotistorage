import { useDownloadSource, useRefreshSource, useDeleteSource } from "./useSources";
import { useDownloads } from "./useDownloads";
import { useIsMutating } from "@tanstack/react-query";

export function useSourceActions(sourceId: string) {
  const download = useDownloadSource();
  const refresh = useRefreshSource();
  const deleteSource = useDeleteSource();
  const { active } = useDownloads();
  const refreshAllPending = useIsMutating({ mutationKey: ["refresh-all"] }) > 0;

  const isDownloading = active.some((j) => j.source_id === sourceId);
  const locked = isDownloading || download.isPending || refreshAllPending;

  return { download, refresh, deleteSource, isDownloading, locked };
}
