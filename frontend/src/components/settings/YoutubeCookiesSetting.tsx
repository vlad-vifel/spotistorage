import { useState } from "react";
import { FolderOpen, Loader2, Save } from "lucide-react";
import { useConfig, useUpdateYoutubeCookies } from "@/hooks/useConfig";
import { useBrowseFile } from "@/hooks/useLibrary";
import { showSuccess } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BROWSERS = [
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "edge", label: "Edge" },
  { value: "brave", label: "Brave" },
  { value: "opera", label: "Opera" },
  { value: "vivaldi", label: "Vivaldi" },
];

type Mode = "none" | "browser" | "file";

function savedMode(config: { youtube_browser?: string | null; youtube_cookies_path?: string | null }): Mode {
  if (config.youtube_browser) return "browser";
  if (config.youtube_cookies_path) return "file";
  return "none";
}

export function YoutubeCookiesSetting() {
  const { data: config } = useConfig();
  const update = useUpdateYoutubeCookies();
  const { browse, isBrowsing } = useBrowseFile();

  const [mode, setMode] = useState<Mode | null>(null);
  const [browser, setBrowser] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  if (!config) return null;

  const sm = savedMode(config);
  const currentMode = mode ?? sm;
  const currentBrowser = browser ?? config.youtube_browser ?? "";
  const currentPath = filePath ?? config.youtube_cookies_path ?? "";

  const isDirty =
    currentMode !== sm ||
    (currentMode === "browser" && currentBrowser !== (config.youtube_browser ?? "")) ||
    (currentMode === "file" && currentPath !== (config.youtube_cookies_path ?? ""));

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setBrowser(null);
    setFilePath(null);
  };

  const handleSave = () => {
    const payload =
      currentMode === "browser"
        ? { youtube_browser: currentBrowser || null, youtube_cookies_path: null }
        : currentMode === "file"
        ? { youtube_cookies_path: currentPath || null, youtube_browser: null }
        : { youtube_browser: null, youtube_cookies_path: null };

    update.mutate(payload, { onSuccess: () => showSuccess("Saved") });
  };

  const canSave =
    isDirty &&
    (currentMode === "none" ||
      (currentMode === "browser" && !!currentBrowser) ||
      (currentMode === "file" && !!currentPath));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Label>Source</Label>
        <Select value={currentMode} onValueChange={(v) => handleModeChange(v as Mode)} disabled={update.isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Disabled</SelectItem>
            <SelectItem value="browser">Read from browser</SelectItem>
            <SelectItem value="file">Read from cookies.txt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currentMode === "browser" && (
        <div className="flex flex-col gap-3">
          <Label>Browser</Label>
          <Select value={currentBrowser} onValueChange={setBrowser} disabled={update.isPending}>
            <SelectTrigger>
              <SelectValue placeholder="— select browser —" />
            </SelectTrigger>
            <SelectContent>
              {BROWSERS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            yt-dlp reads cookies directly from the selected browser. You must be logged into YouTube in it.
          </p>
        </div>
      )}

      {currentMode === "file" && (
        <div className="flex flex-col gap-3">
          <Label htmlFor="yt-cookies">cookies.txt path</Label>
          <div className="flex gap-2">
            <Input
              id="yt-cookies"
              className="font-mono text-xs"
              placeholder="C:\Users\you\cookies.txt"
              value={currentPath}
              onChange={(e) => setFilePath(e.target.value)}
              disabled={update.isPending}
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0"
              onClick={() => browse(setFilePath)}
              disabled={isBrowsing || update.isPending}
            >
              {isBrowsing ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export cookies from your browser using the "Get cookies.txt LOCALLY" extension while logged into YouTube.
          </p>
        </div>
      )}

      {canSave && (
        <Button onClick={handleSave} disabled={update.isPending} size="sm">
          {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      )}
    </div>
  );
}
