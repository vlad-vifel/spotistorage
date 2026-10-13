import { ArrowUpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "@/hooks/useAppUpdate";

export function UpdateBanner() {
  const update = useAppUpdate();
  if (!update) return null;

  return (
    <section className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 md:p-5 max-md:flex-col max-md:items-stretch">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <ArrowUpCircle className="size-5 shrink-0 text-blue-400" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Update available – v{update.latest_version}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            You have v{update.current_version}. Download the new installer from GitHub.
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <a href={update.release_url} target="_blank" rel="noreferrer">
          <ExternalLink className="size-3.5" />
          View release
        </a>
      </Button>
    </section>
  );
}
