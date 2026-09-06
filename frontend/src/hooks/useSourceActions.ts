import { useDownloadSource, useRefreshSource, useDeleteSource } from "./useSources";
import { useDownloads, useRetryAllFailed } from "./useDownloads";

export function useSourceActions(sourceId: string) {
  const download = useDownloadSource();
  const refresh = useRefreshSource();
  const deleteSource = useDeleteSource();
  const retryAll = useRetryAllFailed();
  const { active, failed } = useDownloads();

  const isDownloading = active.some((j) => j.source_id === sourceId);
  const failedJobs = failed.filter((j) => j.source_id === sourceId);
  const locked = isDownloading || download.isPending;

  return { download, refresh, deleteSource, retryAll, isDownloading, failedJobs, locked };
}
