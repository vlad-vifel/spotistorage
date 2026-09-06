import { toast } from "sonner";
import { getErrorMessage } from "@/api/client";

export function showSuccess(message: string) {
  toast.success(message, { duration: 3000 });
}

export function showError(err: unknown, prefix?: string) {
  const msg = getErrorMessage(err);
  toast.error(prefix ? `${prefix}: ${msg}` : msg, { duration: 5000 });
}

export function showInfo(message: string) {
  toast.info(message, { duration: 3000 });
}

export function showWarning(message: string) {
  toast.warning(message, { duration: 4000 });
}
