import { api } from "./client";
import type { Source, AnyResolveResult, QueuedResult, RefreshResult, RefreshAllResult } from "./types";

export const sourcesApi = {
  list: () => api.get<Source[]>("/sources"),
  get: (id: string) => api.get<Source>(`/sources/${id}`),
  resolve: (url: string) => api.post<AnyResolveResult>("/sources/resolve", { url }),
  add: (url: string) => api.post<Source>("/sources", { url }),
  download: (id: string) => api.post<QueuedResult>(`/sources/${id}/download`),
  downloadAll: () => api.post<QueuedResult>("/sources/download-all"),
  refresh: (id: string) => api.post<RefreshResult>(`/sources/${id}/refresh`),
  refreshAll: () => api.post<RefreshAllResult>("/sources/refresh-all"),
  delete: (id: string) => api.delete(`/sources/${id}`),
  deleteTrack: (sourceId: string, trackId: string) => api.delete(`/sources/${sourceId}/tracks/${trackId}`),
};
