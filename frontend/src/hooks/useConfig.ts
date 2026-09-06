import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "../api/config";
import { showError } from "@/lib/toast";
import type { AppConfig } from "../api/types";

export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: configApi.get });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: AppConfig) => configApi.update(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
    onError: (e) => showError(e, "Failed to update config"),
  });
}

export function useUpdateSpDc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sp_dc: string | null) => configApi.updateSpDc(sp_dc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
    onError: (e) => showError(e, "Failed to save Spotify cookie"),
  });
}

export function useUpdateYoutubeCookies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { youtube_cookies_path?: string | null; youtube_browser?: string | null }) =>
      configApi.updateYoutubeCookies(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
    onError: (e) => showError(e, "Failed to save YouTube settings"),
  });
}

export function useUpdateDeezerArl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deezer_arl: string | null) => configApi.updateDeezerArl(deezer_arl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
    onError: (e) => showError(e, "Failed to save Deezer ARL"),
  });
}

export function useDeps() {
  return useQuery({
    queryKey: ["deps"],
    queryFn: configApi.getDeps,
    staleTime: 30_000,
  });
}

export function useCreateLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) =>
      configApi.createLibrary(name, path),
    onSuccess: () => {
      qc.setQueryData<AppConfig>(["config"], (old) =>
        old ? { ...old, setup_complete: true } : old
      );
      qc.invalidateQueries({ queryKey: ["config"] });
    },
  });
}
