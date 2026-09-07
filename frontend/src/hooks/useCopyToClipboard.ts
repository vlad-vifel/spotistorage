import { useState } from "react";
import { showError } from "@/lib/toast";

export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      },
      (e) => showError(e, "Could not copy to clipboard")
    );
  };

  return { copied, copy };
}
