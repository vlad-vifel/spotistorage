import { Link, useLocation } from "react-router-dom";
import { useDownloads } from "@/hooks/useDownloads";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./navItems";
import { NavErrorBadge } from "./NavErrorBadge";

export function BottomNav() {
  const location = useLocation();
  const { failed } = useDownloads();

  return (
    <nav className="h-(--bottom-nav-h) flex items-stretch border-t border-border/50 bg-sidebar shrink-0">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive = isNavActive(location.pathname, href);
        return (
          <Link
            key={href}
            to={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors active:bg-sidebar-accent/60",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            <span className="relative">
              <Icon className="size-5" />
              {href === "/errors" && failed.length > 0 && (
                <NavErrorBadge count={failed.length} className="absolute -top-1 -right-1.5 leading-none" />
              )}
            </span>
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
