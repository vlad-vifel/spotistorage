import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showSuccess } from "@/lib/toast";
import type { Source } from "@/api/types";
import type { useSourceActions } from "./useSourceActions";

type DeleteSource = ReturnType<typeof useSourceActions>["deleteSource"];

export function useDeleteSourceFlow(
  source: Source,
  deleteSource: DeleteSource,
  options: { navigateAway?: boolean } = {}
) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const confirm = () => {
    deleteSource.mutate(source.id, {
      onSuccess: () => {
        if (options.navigateAway) {
          showSuccess(`Removed "${source.name}" from the library`);
          navigate("/library", { replace: true });
        } else {
          setOpen(false);
        }
      },
    });
  };

  return { open, openDelete: () => setOpen(true), setOpen, confirm };
}
