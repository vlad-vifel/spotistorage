import { api } from "./client";
import type { DownloadJob } from "./types";

export const downloadsApi = {
  list: () => api.get<DownloadJob[]>("/downloads"),
  retry: (jobId: string) => api.post<DownloadJob>(`/downloads/${jobId}/retry`),
  retryWithUrl: (jobId: string, url: string) =>
    api.post<DownloadJob>(`/downloads/${jobId}/retry-with-url`, { url }),
  remove: (jobId: string) => api.delete(`/downloads/${jobId}`),
  cancelAll: () => api.delete<{ cancelled: number }>("/downloads"),
  clearAllFailed: () => api.post<{ cleared: number }>("/downloads/clear-failed"),
  downloadTrack: (sourceId: string, trackId: string) =>
    api.post<{ queued: number }>(`/sources/${sourceId}/tracks/${trackId}/download`),
};
