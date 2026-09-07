export interface AndroidBridge {
  pickLibraryFolder(): void;
  requestStoragePermission(): void;
  requestNotificationPermission(): void;
  checkNotificationPermission(): void;
  getApiToken(): string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
    __onFolderPicked?: (path: string) => void;
    __onPermissionResult?: (kind: "storage" | "notifications", granted: boolean) => void;
  }
}

type PermissionKind = "storage" | "notifications";
const permissionListeners = new Map<PermissionKind, Set<(granted: boolean) => void>>();

window.__onPermissionResult = (kind, granted) => {
  for (const cb of permissionListeners.get(kind) ?? []) cb(granted);
};

function listenOnce(kind: PermissionKind, onResult: (granted: boolean) => void): void {
  let set = permissionListeners.get(kind);
  if (!set) {
    set = new Set();
    permissionListeners.set(kind, set);
  }
  const wrapped = (granted: boolean) => {
    set!.delete(wrapped);
    onResult(granted);
  };
  set.add(wrapped);
}

export function isAndroid(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidBridge !== "undefined";
}

export function pickLibraryFolder(onPicked: (path: string) => void): void {
  window.__onFolderPicked = onPicked;
  window.AndroidBridge?.pickLibraryFolder();
}

export function requestStoragePermission(onResult: (granted: boolean) => void): void {
  listenOnce("storage", onResult);
  window.AndroidBridge?.requestStoragePermission();
}

export function requestNotificationPermission(onResult: (granted: boolean) => void): void {
  listenOnce("notifications", onResult);
  window.AndroidBridge?.requestNotificationPermission();
}

export function checkNotificationPermission(onResult: (granted: boolean) => void): void {
  listenOnce("notifications", onResult);
  window.AndroidBridge?.checkNotificationPermission();
}

export function getApiToken(): string | null {
  return window.AndroidBridge?.getApiToken() ?? null;
}
