import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/common/CopyButton";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function YoutubeCookiesPasteMode({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="yt-cookies-text">cookies.txt content</Label>
        {value && <CopyButton value={value} />}
      </div>
      <Textarea
        id="yt-cookies-text"
        className="font-mono text-xs min-h-32"
        placeholder={"# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tNAME\tvalue"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Paste the full contents of a cookies.txt file exported while logged into YouTube. Useful when no file
        picker is available, such as on Android.
      </p>
    </div>
  );
}
