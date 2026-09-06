import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { downloadsApi } from "../api/downloads";
import { showError } from "@/lib/toast";

export function useDownloads() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["downloads"],
    queryFn: downloadsApi.list,
    refetchInterval: (query) => {
      const active = query.state.data?.some(
        (j) => j.status === "queued" || j.status === "downloading"
      );
      return active ? 1000 : false;
    },
  });

  const active = useMemo(() => jobs.filter((j) => j.status === "queued" || j.status === "downloading"), [jobs]);
  const failed = useMemo(() => jobs.filter((j) => j.status === "failed"), [jobs]);
  const done = useMemo(() => jobs.filter((j) => j.status === "done"), [jobs]);

  return { jobs, active, failed, done };
}

export function useRetryDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.retry(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useRetryWithUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, url }: { jobId: string; url: string }) => downloadsApi.retryWithUrl(jobId, url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useRetryAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobIds: string[]) => Promise.all(jobIds.map((id) => downloadsApi.retry(id))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useCancelDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.remove(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

export function useCancelAllDownloads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => downloadsApi.cancelAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

export function useClearAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => downloadsApi.clearAllFailed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}
