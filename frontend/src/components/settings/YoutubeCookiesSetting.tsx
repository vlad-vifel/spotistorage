import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useConfig, useUpdateYoutubeCookies } from "@/hooks/useConfig";
import { useBrowseFile } from "@/hooks/useLibrary";
import { showSuccess } from "@/lib/toast";
import { isAndroid } from "@/lib/androidBridge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YoutubeCookiesBrowserMode } from "./YoutubeCookiesBrowserMode";
import { YoutubeCookiesFileMode } from "./YoutubeCookiesFileMode";
import { YoutubeCookiesPasteMode } from "./YoutubeCookiesPasteMode";

type Mode = "none" | "browser" | "file" | "paste";

function savedMode(config: {
  youtube_browser?: string | null;
  youtube_cookies_path?: string | null;
  youtube_cookies_content?: string | null;
}): Mode {
  if (config.youtube_cookies_content) return "paste";
  if (config.youtube_browser) return "browser";
  if (config.youtube_cookies_path) return "file";
  return "none";
}

export function YoutubeCookiesSetting() {
  const { data: config } = useConfig();
  const update = useUpdateYoutubeCookies();
  const { browse, isBrowsing } = useBrowseFile();
  const android = isAndroid();

  const [mode, setMode] = useState<Mode | null>(null);
  const [browser, setBrowser] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState<string | null>(null);

  if (!config) return null;

  const sm = savedMode(config);
  const currentMode = mode ?? sm;
  const currentBrowser = browser ?? config.youtube_browser ?? "";
  const currentPath = filePath ?? config.youtube_cookies_path ?? "";
  const savedContent = config.youtube_cookies_content ?? "";
  const currentPasteText = pasteText ?? savedContent;

  const isDirty =
    currentMode !== sm ||
    (currentMode === "browser" && currentBrowser !== (config.youtube_browser ?? "")) ||
    (currentMode === "file" && currentPath !== (config.youtube_cookies_path ?? "")) ||
    (currentMode === "paste" && pasteText !== null && pasteText.trim() !== savedContent.trim());

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setBrowser(null);
    setFilePath(null);
    setPasteText(null);
  };

  const handleSave = () => {
    const payload =
      currentMode === "browser"
        ? { youtube_browser: currentBrowser || null, youtube_cookies_path: null, youtube_cookies_text: null }
        : currentMode === "file"
        ? { youtube_cookies_path: currentPath || null, youtube_browser: null, youtube_cookies_text: null }
        : currentMode === "paste"
        ? { youtube_cookies_text: currentPasteText.trim() || null, youtube_browser: null, youtube_cookies_path: null }
        : { youtube_browser: null, youtube_cookies_path: null, youtube_cookies_text: null };

    update.mutate(payload, {
      onSuccess: () => {
        showSuccess("Saved");
        if (currentMode === "paste") setPasteText(null);
      },
    });
  };

  const canSave =
    isDirty &&
    (currentMode === "none" ||
      (currentMode === "browser" && !!currentBrowser) ||
      (currentMode === "file" && !!currentPath) ||
      (currentMode === "paste" && currentPasteText.trim().length > 0));

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
            {!android && <SelectItem value="browser">Read from browser</SelectItem>}
            <SelectItem value="file">Read from cookies.txt</SelectItem>
            <SelectItem value="paste">Paste cookies.txt content</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currentMode === "browser" && (
        <YoutubeCookiesBrowserMode value={currentBrowser} onChange={setBrowser} disabled={update.isPending} />
      )}

      {currentMode === "file" && (
        <YoutubeCookiesFileMode
          value={currentPath}
          onChange={setFilePath}
          onBrowse={() => browse(setFilePath)}
          isBrowsing={isBrowsing}
          disabled={update.isPending}
          showBrowseButton={!android}
        />
      )}

      {currentMode === "paste" && (
        <YoutubeCookiesPasteMode value={currentPasteText} onChange={setPasteText} disabled={update.isPending} />
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
