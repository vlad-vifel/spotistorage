import { useConfig } from "./useConfig";

export type SetupStep = "welcome" | "permissions" | "folder" | "deps";

export function useSetupSteps(): SetupStep[] {
  const { data: config } = useConfig();
  const steps: SetupStep[] = ["welcome"];
  if (config?.platform === "android") steps.push("permissions");
  steps.push("folder", "deps");
  return steps;
}
