import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useDeps } from "@/hooks/useConfig";
import { Spinner } from "@/components/ui/spinner";

export function DependencyStatus() {
  const { data: deps, isLoading, isError } = useDeps();

  const items = [
    { key: "ffmpeg", label: "FFmpeg", ok: deps?.ffmpeg },
    { key: "yt_dlp", label: "yt-dlp", ok: deps?.yt_dlp },
    { key: "pycryptodome", label: "pycryptodome", ok: deps?.pycryptodome },
  ];

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size={14} />
          Checking dependencies...
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Could not check dependencies - is the backend running?
        </div>
      ) : (
        items.map(({ key, label, ok }) => (
          <div key={key} className="flex items-center gap-3">
            {ok ? (
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="size-4 text-destructive shrink-0" />
            )}
            <span className="text-sm">{label}</span>
            <span className={`text-xs ml-auto ${ok ? "text-emerald-400" : "text-destructive"}`}>
              {ok ? "found" : "not found - install manually"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
