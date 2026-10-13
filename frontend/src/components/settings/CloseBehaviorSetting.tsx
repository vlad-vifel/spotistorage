import { useConfig, useUpdateCloseAction } from "@/hooks/useConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CloseAction } from "@/api/types";

const DESCRIPTIONS: Record<CloseAction, string> = {
  quit: "Closing the window quits SpotiStorage. You'll be asked to confirm if downloads are still running.",
  tray: "Closing the window keeps SpotiStorage running in the system tray, so downloads continue in the background.",
};

export function CloseBehaviorSetting() {
  const { data: config } = useConfig();
  const update = useUpdateCloseAction();
  const value = config?.close_action ?? "quit";

  return (
    <div className="flex flex-col gap-3">
      <Select value={value} onValueChange={(v) => update.mutate(v as CloseAction)} disabled={update.isPending}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quit">Quit the app</SelectItem>
          <SelectItem value="tray">Minimize to tray</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{DESCRIPTIONS[value]}</p>
    </div>
  );
}
