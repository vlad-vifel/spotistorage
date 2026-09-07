import { useEffect, useState } from "react";
import { HardDrive, Bell, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionStatus, type PermState } from "@/components/common/PermissionStatus";
import { requestStoragePermission, requestNotificationPermission, checkNotificationPermission } from "@/lib/androidBridge";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function StepPermissions({ onBack, onNext }: Props) {
  const [storage, setStorage] = useState<PermState>("pending");
  const [notifications, setNotifications] = useState<PermState>("pending");

  useEffect(() => {
    checkNotificationPermission((granted) => granted && setNotifications("granted"));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold mb-1">Grant permissions</h2>
        <p className="text-sm text-muted-foreground">
          SpotiStorage needs storage access to save your music files, and notification access to
          alert you when downloads finish.
        </p>
      </div>

      <div className="space-y-2">
        <PermissionRow
          icon={HardDrive}
          label="File access"
          state={storage}
          onRequest={() => requestStoragePermission((granted) => setStorage(granted ? "granted" : "denied"))}
        />
        <PermissionRow
          icon={Bell}
          label="Notifications"
          state={notifications}
          onRequest={() =>
            requestNotificationPermission((granted) => setNotifications(granted ? "granted" : "denied"))
          }
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <Button size="sm" disabled={storage !== "granted"} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function PermissionRow({
  icon: Icon,
  label,
  state,
  onRequest,
}: {
  icon: LucideIcon;
  label: string;
  state: PermState;
  onRequest: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      <PermissionStatus state={state} onRequest={onRequest} />
    </div>
  );
}
