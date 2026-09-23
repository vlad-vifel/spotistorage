import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { downloadsApi } from "../api/downloads";
import { showError } from "@/lib/toast";
import { startDownloadService } from "@/lib/androidBridge";

export function useDownloads() {
  const summary = useDownloadSummary();
  const { data: jobs = [] } = useQuery({
    queryKey: ["downloads"],
    queryFn: downloadsApi.list,
    refetchInterval: summary.data?.active ? 1000 : false,
  });

  const active = useMemo(() => jobs.filter((j) => j.status === "queued" || j.status === "downloading"), [jobs]);
  const failed = useMemo(() => jobs.filter((j) => j.status === "failed"), [jobs]);
  const done = useMemo(() => jobs.filter((j) => j.status === "done"), [jobs]);

  return { jobs, active, failed, done, summary: summary.data };
}

export function useDownloadSummary() {
  return useQuery({
    queryKey: ["download-summary"],
    queryFn: downloadsApi.summary,
    refetchInterval: (query) => query.state.data?.active ? 1000 : false,
  });
}

export function useRetryDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.retry(jobId),
    onSuccess: () => {
      startDownloadService();
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useRetryWithUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, url }: { jobId: string; url: string }) => downloadsApi.retryWithUrl(jobId, url),
    onSuccess: () => {
      startDownloadService();
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useRetryAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobIds: string[]) => Promise.all(jobIds.map((id) => downloadsApi.retry(id))),
    onSuccess: () => {
      startDownloadService();
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
    onError: (e) => showError(e, "Retry failed"),
  });
}

export function useCancelDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.remove(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
  });
}

export function useCancelAllDownloads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => downloadsApi.cancelAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
  });
}

export function useClearAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => downloadsApi.clearAllFailed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["download-summary"] });
    },
  });
}
