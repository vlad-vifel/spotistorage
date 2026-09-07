import { useEffect, useState } from "react";
import { PermissionStatus, type PermState } from "@/components/common/PermissionStatus";
import { checkNotificationPermission, requestNotificationPermission } from "@/lib/androidBridge";

export function NotificationPermissionSetting() {
  const [state, setState] = useState<PermState>("unknown");

  useEffect(() => {
    checkNotificationPermission((granted) => setState(granted ? "granted" : "unknown"));
  }, []);

  const request = () =>
    requestNotificationPermission((granted) => setState(granted ? "granted" : "denied"));

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm text-muted-foreground">
        {state === "denied"
          ? "Denied – enable it from your phone's Settings > Apps > SpotiStorage > Notifications."
          : "Alerts you when a download finishes or fails, even while the app is backgrounded."}
      </span>
      <PermissionStatus state={state} onRequest={request} />
    </div>
  );
}
