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

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function YoutubeCookiesBrowserMode({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Browser</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select browser" />
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
  );
}
