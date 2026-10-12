import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "../api/sources";
import { showSuccess, showInfo, showError } from "@/lib/toast";
import { pluralize } from "@/lib/utils";

export function useDeleteRemovedTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sourcesApi.deleteRemoved(id),
    onSuccess: (result) => {
      if (result.deleted === 0) showInfo("No removed tracks to delete");
      else showSuccess(`Deleted ${pluralize(result.deleted, "removed track")}`);
    },
    onError: (e) => showError(e, "Failed to delete removed tracks"),
    onSettled: (_, __, id) => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["source", id] });
    },
  });
}

export function useDeleteAllRemovedTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sourcesApi.deleteRemovedAll(),
    onSuccess: (result) => {
      if (result.deleted === 0) showInfo("No removed tracks to delete");
      else showSuccess(`Deleted ${pluralize(result.deleted, "removed track")} from ${pluralize(result.sources, "source")}`);
    },
    onError: (e) => showError(e, "Failed to delete removed tracks"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["source"] });
    },
  });
}
