import { useState } from "react";
import { useDeleteRemovedTracks } from "./useSources";
import { getRemovedCount } from "@/lib/status";
import type { Source } from "@/api/types";

export function useDeleteRemovedFlow(source: Source) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteRemovedTracks();

  return {
    count: getRemovedCount(source),
    open,
    setOpen,
    openDialog: () => setOpen(true),
    confirm: () => mutation.mutate(source.id, { onSuccess: () => setOpen(false) }),
    isPending: mutation.isPending,
  };
}
