import { api } from "./client";
import type { AppConfig, AppUpdateInfo, CloseAction, Library, DepsStatus } from "./types";

export const configApi = {
  get: () => api.get<AppConfig>("/config"),
  update: (config: AppConfig) => api.put<AppConfig>("/config", config),
  updateSpDc: (sp_dc: string | null) => api.put<void>("/config/sp-dc", { sp_dc }),
  updateYoutubeCookies: (params: {
    youtube_cookies_path?: string | null;
    youtube_browser?: string | null;
    youtube_cookies_text?: string | null;
  }) => api.put<void>("/config/youtube-cookies", params),
  updateDeezerArl: (deezer_arl: string | null) => api.put<void>("/config/deezer-arl", { deezer_arl }),
  updateCloseAction: (close_action: CloseAction) => api.put<void>("/config/close-action", { close_action }),
  getAppUpdate: () => api.get<AppUpdateInfo>("/app/update"),
  completeSetup: () => api.put<void>("/config/complete-setup", {}),
  getDeps: () => api.get<DepsStatus>("/dependencies"),
  createLibrary: (name: string, root_path: string) =>
    api.post<Library>("/libraries", { name, root_path }),
  deleteLibrary: (id: string) => api.delete(`/libraries/${id}`),
  browseFolder: () => api.get<{ path: string }>("/config/browse-folder"),
  browseFile: () => api.get<{ path: string }>("/config/browse-file"),
};
