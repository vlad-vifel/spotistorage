import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PermState = "pending" | "unknown" | "granted" | "denied";

interface Props {
  state: PermState;
  onRequest: () => void;
  className?: string;
}

export function PermissionStatus({ state, onRequest, className }: Props) {
  if (state === "granted") {
    return (
      <span className={cn("flex h-8 max-md:h-10 items-center gap-1 text-xs text-emerald-400 shrink-0", className)}>
        <CheckCircle2 className="size-3.5" /> Granted
      </span>
    );
  }
  return (
    <Button variant="outline" size="sm" className={cn("shrink-0", className)} onClick={onRequest}>
      {state === "denied" ? "Try again" : "Grant"}
    </Button>
  );
}
