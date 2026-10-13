import { useConfig } from "./useConfig";

export function useIsDesktopApp(): boolean {
  const { data: config } = useConfig();
  return config?.platform === "windows";
}
