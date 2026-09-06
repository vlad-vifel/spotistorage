import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "../api/sources";
import { downloadsApi } from "../api/downloads";
import { showSuccess, showInfo, showWarning, showError } from "@/lib/toast";
import { pluralize } from "@/lib/utils";
import type { Source, TrackStatus } from "@/api/types";

export function useAddSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => sourcesApi.add(url),
    onSuccess: (source: Source) => {
      showSuccess(`Added "${source.name}"`);
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e) => showError(e, "Failed to add"),
  });
}

export function useDownloadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sourcesApi.download(id),
    onMutate: async (sourceId) => {
      await qc.cancelQueries({ queryKey: ["source", sourceId] });
      const prevSource = qc.getQueryData<Source>(["source", sourceId]);
      qc.setQueryData<Source>(["source", sourceId], (old) => {
        if (!old?.tracks) return old;
        return {
          ...old,
          tracks: old.tracks.map((t) =>
            t.status === "missing" ? { ...t, status: "queued" as TrackStatus } : t
          ),
        };
      });
      return { prevSource, sourceId };
    },
    onSuccess: (result) => {
      if (result.queued === 0) showInfo("Everything is already downloaded");
      else showSuccess(`Queued ${pluralize(result.queued, "track")}`);
    },
    onError: (e, _, ctx) => {
      showError(e, "Download failed");
      if (ctx?.prevSource) qc.setQueryData(["source", ctx.sourceId], ctx.prevSource);
    },
    onSettled: (_, __, sourceId) => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["source", sourceId] });
    },
  });
}

export function useRefreshSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sourcesApi.refresh(id),
    onSuccess: (result, id) => {
      const parts: string[] = [];
      if (result.new === 0 && result.removed_from_source === 0 && result.renamed === 0) {
        showInfo("Up to date - no changes");
      } else {
        if (result.new > 0) parts.push(pluralize(result.new, "new track", "new tracks"));
        if (result.renamed > 0) parts.push(`${result.renamed} renamed`);
        if (result.missing > 0) parts.push(`${result.missing} missing`);
        if (parts.length > 0) showSuccess(parts.join(" - "));
        if (result.removed_from_source > 0) {
          showWarning(
            `${result.removed_from_source} track${result.removed_from_source === 1 ? " is" : "s are"} no longer in the source. Your files were kept.`
          );
        }
      }
      qc.invalidateQueries({ queryKey: ["source", id] });
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e) => showError(e, "Refresh failed"),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sourcesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
    onError: (e) => showError(e, "Delete failed"),
  });
}

export function useRefreshAllSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sourcesApi.refreshAll(),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.new > 0) parts.push(`${result.new} new`);
      if (result.removed_from_source > 0) parts.push(`${result.removed_from_source} removed`);
      if (parts.length > 0) showSuccess(`Refreshed ${result.refreshed} sources – ${parts.join(", ")}`);
      else showInfo(`All ${result.refreshed} sources up to date`);
      if (result.errors > 0) showWarning(`${pluralize(result.errors, "source")} failed to refresh`);
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e) => showError(e, "Refresh all failed"),
  });
}

export function useDownloadAllMissing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sourcesApi.downloadAll(),
    onSuccess: (result) => {
      if (result.queued === 0) showInfo("Everything is already downloaded");
      else showSuccess(`Queued ${pluralize(result.queued, "track")}`);
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e) => showError(e, "Download all failed"),
  });
}

export function useResolveUrl() {
  return useMutation({
    mutationFn: (url: string) => sourcesApi.resolve(url),
    onError: (e) => showError(e, "Could not resolve URL"),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, trackId }: { sourceId: string; trackId: string }) =>
      sourcesApi.deleteTrack(sourceId, trackId),
    onMutate: async ({ sourceId, trackId }) => {
      await qc.cancelQueries({ queryKey: ["source", sourceId] });
      const prevSource = qc.getQueryData<Source>(["source", sourceId]);
      qc.setQueryData<Source>(["source", sourceId], (old) => {
        if (!old?.tracks) return old;
        const track = old.tracks.find((t) => t.id === trackId);
        const isRemovedFromSource = track?.status === "removed_from_source";
        const wasDownloaded = track?.status === "downloaded" || track?.status === "wrong_track";
        return {
          ...old,
          total_tracks: isRemovedFromSource ? old.total_tracks - 1 : old.total_tracks,
          downloaded_tracks: wasDownloaded ? old.downloaded_tracks - 1 : old.downloaded_tracks,
          tracks: isRemovedFromSource
            ? old.tracks.filter((t) => t.id !== trackId)
            : old.tracks.map((t) =>
                t.id === trackId ? { ...t, status: "missing" as TrackStatus, file: null } : t
              ),
        };
      });
      return { prevSource, sourceId };
    },
    onError: (e, _, ctx) => {
      showError(e, "Failed to delete track");
      if (ctx?.prevSource) qc.setQueryData(["source", ctx.sourceId], ctx.prevSource);
    },
    onSettled: (_, __, { sourceId }) => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["source", sourceId] });
    },
  });
}

export function useDownloadSingleTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, trackId }: { sourceId: string; trackId: string }) =>
      downloadsApi.downloadTrack(sourceId, trackId),
    onMutate: async ({ sourceId, trackId }) => {
      await qc.cancelQueries({ queryKey: ["source", sourceId] });
      const prevSource = qc.getQueryData<Source>(["source", sourceId]);
      qc.setQueryData<Source>(["source", sourceId], (old) => {
        if (!old?.tracks) return old;
        return {
          ...old,
          tracks: old.tracks.map((t) =>
            t.id === trackId ? { ...t, status: "queued" as TrackStatus } : t
          ),
        };
      });
      return { prevSource, sourceId };
    },
    onError: (e, _, ctx) => {
      showError(e, "Track download failed");
      if (ctx?.prevSource) qc.setQueryData(["source", ctx.sourceId], ctx.prevSource);
    },
    onSettled: (_, __, { sourceId }) => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["source", sourceId] });
    },
  });
}
