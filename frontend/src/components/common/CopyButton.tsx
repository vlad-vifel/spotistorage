import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: Props) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      className={cn("p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors", className)}
      onClick={() => copy(value)}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </button>
  );
}
