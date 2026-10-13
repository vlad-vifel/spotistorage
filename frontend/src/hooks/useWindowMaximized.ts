import { useEffect, useState } from "react";
import { isWindowMaximized } from "@/lib/desktopBridge";

export function useWindowMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => isWindowMaximized().then(setMaximized).catch(() => {}), 80);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return [maximized, setMaximized] as const;
}
