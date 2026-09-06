import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateConfig, useCreateLibrary as _useCreateLibrary } from "./useConfig";
import { configApi } from "@/api/config";
import { showSuccess, showError } from "@/lib/toast";
import type { AppConfig } from "@/api/types";

export { _useCreateLibrary as useCreateLibrary };

export function useSwitchLibrary() {
  const qc = useQueryClient();
  const update = useUpdateConfig();

  return {
    mutate: ({ config, libraryId }: { config: AppConfig; libraryId: string }) => {
      const lib = config.libraries.find((l) => l.id === libraryId);
      update.mutate(
        { ...config, active_library_id: libraryId },
        {
          onSuccess: () => {
            showSuccess(`Switched to "${lib?.name ?? libraryId}"`);
            qc.invalidateQueries({ queryKey: ["sources"] });
          },
          onError: (e) => showError(e, "Failed to switch library"),
        }
      );
    },
    isPending: update.isPending,
  };
}

export function useDeleteLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => configApi.deleteLibrary(id),
    onSuccess: () => {
      showSuccess("Library removed");
      qc.invalidateQueries({ queryKey: ["config"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e) => showError(e, "Failed to remove library"),
  });
}

export function useBrowseFolder() {
  const [isBrowsing, setIsBrowsing] = useState(false);

  async function browse(setPath: (path: string) => void) {
    setIsBrowsing(true);
    try {
      const { path } = await configApi.browseFolder();
      if (path) setPath(path);
    } catch (e) {
      showError(e, "Could not open folder picker");
    } finally {
      setIsBrowsing(false);
    }
  }

  return { browse, isBrowsing };
}

export function useBrowseFile() {
  const [isBrowsing, setIsBrowsing] = useState(false);

  async function browse(setPath: (path: string) => void) {
    setIsBrowsing(true);
    try {
      const { path } = await configApi.browseFile();
      if (path) setPath(path);
    } catch (e) {
      showError(e, "Could not open file picker");
    } finally {
      setIsBrowsing(false);
    }
  }

  return { browse, isBrowsing };
}
