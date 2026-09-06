import { useEffect, useRef, useState } from "react";

export function useCompactHeader() {
  const [compact, setCompact] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const scrollRoot = el.closest<HTMLElement>(".overflow-y-auto") ?? null;
    const obs = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { root: scrollRoot, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { compact, headerRef };
}
