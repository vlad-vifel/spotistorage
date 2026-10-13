import { useQuery } from "@tanstack/react-query";
import { configApi } from "@/api/config";
import { useIsDesktopApp } from "./useIsDesktopApp";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function useAppUpdate() {
  const isDesktopApp = useIsDesktopApp();
  const { data } = useQuery({
    queryKey: ["app-update"],
    queryFn: configApi.getAppUpdate,
    enabled: isDesktopApp,
    staleTime: SIX_HOURS,
    refetchInterval: SIX_HOURS,
    retry: false,
  });
  return data?.update_available ? data : null;
}
