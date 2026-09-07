import { FolderOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  isBrowsing: boolean;
  disabled?: boolean;
  showBrowseButton?: boolean;
}

export function YoutubeCookiesFileMode({
  value, onChange, onBrowse, isBrowsing, disabled, showBrowseButton = true,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="yt-cookies">cookies.txt path</Label>
      <div className="flex gap-2">
        <Input
          id="yt-cookies"
          className="font-mono text-xs"
          placeholder="C:\Users\you\cookies.txt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        {showBrowseButton && (
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0"
            onClick={onBrowse}
            disabled={isBrowsing || disabled}
          >
            {isBrowsing ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Export cookies from your browser using the "Get cookies.txt LOCALLY" extension while logged into YouTube.
      </p>
    </div>
  );
}
