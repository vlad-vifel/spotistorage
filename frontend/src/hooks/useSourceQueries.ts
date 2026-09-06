import { useQuery } from "@tanstack/react-query";
import { sourcesApi } from "../api/sources";
import { useDownloads } from "./useDownloads";

export function useSources() {
  const { active } = useDownloads();
  return useQuery({
    queryKey: ["sources"],
    queryFn: sourcesApi.list,
    refetchInterval: active.length > 0 ? 3000 : false,
  });
}

export function useSource(id: string) {
  const { jobs } = useDownloads();
  const hasActive = jobs.some(
    (j) => j.source_id === id && (j.status === "queued" || j.status === "downloading")
  );

  return useQuery({
    queryKey: ["source", id],
    queryFn: () => sourcesApi.get(id),
    enabled: !!id,
    refetchInterval: hasActive ? 1500 : false,
  });
}
