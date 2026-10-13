interface DesktopApi {
  pick_folder(): Promise<string | null>;
  pick_file(): Promise<string | null>;
  window_minimize(): Promise<void>;
  window_toggle_maximize(): Promise<boolean>;
  window_close(): Promise<void>;
  window_is_maximized(): Promise<boolean>;
  window_start_drag(): Promise<void>;
  window_start_resize(edge: ResizeEdge): Promise<void>;
}

export type ResizeEdge = "top" | "top-left" | "top-right";

declare global {
  interface Window {
    pywebview?: { api?: Partial<DesktopApi> };
  }
}

export function isDesktopApp(): boolean {
  return typeof window.pywebview !== "undefined";
}

function desktopApi(): Promise<DesktopApi> {
  const api = window.pywebview?.api;
  if (api?.pick_folder && api.pick_file) return Promise.resolve(api as DesktopApi);
  return new Promise((resolve) => {
    window.addEventListener("pywebviewready", () => resolve(window.pywebview!.api as DesktopApi), { once: true });
  });
}

export async function pickFolder(): Promise<string | null> {
  return (await desktopApi()).pick_folder();
}

export async function pickFile(): Promise<string | null> {
  return (await desktopApi()).pick_file();
}

export async function minimizeWindow(): Promise<void> {
  await (await desktopApi()).window_minimize();
}

export async function toggleMaximizeWindow(): Promise<boolean> {
  return (await desktopApi()).window_toggle_maximize();
}

export async function closeWindow(): Promise<void> {
  await (await desktopApi()).window_close();
}

export async function isWindowMaximized(): Promise<boolean> {
  return (await desktopApi()).window_is_maximized();
}

export async function startWindowDrag(): Promise<void> {
  await (await desktopApi()).window_start_drag();
}

export async function startWindowResize(edge: ResizeEdge): Promise<void> {
  await (await desktopApi()).window_start_resize(edge);
}
