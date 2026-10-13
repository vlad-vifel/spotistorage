import { Fragment, type CSSProperties } from "react";
import { Outlet, useLocation, useMatch, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "./AppSidebar";
import { DownloadBar } from "./DownloadBar";
import { BottomNav } from "./BottomNav";
import { UpdatePill } from "./UpdatePill";
import { WindowTitleBar } from "./WindowTitleBar";
import { useDownloadNotifications } from "@/hooks/useDownloadNotifications";
import { useSource } from "@/hooks/useSources";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useIsDesktopApp } from "@/hooks/useIsDesktopApp";
import { cn } from "@/lib/utils";

const STATIC_TITLES: Record<string, string> = {
  "/library": "Library",
  "/add": "Add from Spotify",
  "/errors": "Errors",
  "/settings": "Settings",
};

function AppBreadcrumbs() {
  const location = useLocation();
  const sourceMatch = useMatch("/library/:id");
  const sourceId = sourceMatch?.params?.id;
  const { data: source } = useSource(sourceId ?? "");

  if (sourceId) {
    const crumbs = [
      { label: "Library", href: "/library" },
      { label: source?.name ?? "..." },
    ];
    return (
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="min-w-0 flex-nowrap">
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              <BreadcrumbItem className={i === crumbs.length - 1 ? "min-w-0" : undefined}>
                {i < crumbs.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href!}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const title = STATIC_TITLES[location.pathname] ?? "Library";
  return <h1 className="text-sm font-medium text-foreground/70">{title}</h1>;
}

export function AppShell() {
  const { lastBatch, clearLastBatch } = useDownloadNotifications();
  const isMobile = useIsMobile();
  const isDesktopApp = useIsDesktopApp();

  const shell = (
    <SidebarProvider
      className={cn("min-h-0! overflow-hidden", isDesktopApp ? "h-full!" : "h-svh!")}
      style={{ "--sidebar-width": "188px" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset className={cn("flex flex-col min-h-0 overflow-hidden", isDesktopApp && "peer-data-[variant=inset]:min-h-0 md:peer-data-[variant=inset]:mt-0")}>
        <header className="max-md:hidden flex h-12 shrink-0 items-center gap-2 px-4 border-b border-border/50">
          {!isMobile && <SidebarTrigger className="-ml-1" />}
          <AppBreadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            <UpdatePill />
            {lastBatch && (
              <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-xs shrink-0">
                {lastBatch.failed > 0 || lastBatch.cancelled > 0 ? (
                  <AlertCircle className="size-3 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                )}
                <span className="text-muted-foreground tabular-nums">
                  {lastBatch.done > 0 && `${lastBatch.done} downloaded`}
                  {lastBatch.done > 0 && (lastBatch.failed > 0 || lastBatch.cancelled > 0) && " - "}
                  {lastBatch.failed > 0 && `${lastBatch.failed} failed`}
                  {lastBatch.failed > 0 && lastBatch.cancelled > 0 && " - "}
                  {lastBatch.cancelled > 0 && `${lastBatch.cancelled} cancelled`}
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                  onClick={clearLastBatch}
                  aria-label="Dismiss download summary"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        </header>
        <div
          data-scroll-root
          className="flex-1 min-h-0 overflow-y-auto max-md:overflow-x-hidden md:[scrollbar-gutter:stable]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Outlet />
          </div>
        </div>
        <DownloadBar />
        {isMobile && <BottomNav />}
      </SidebarInset>
    </SidebarProvider>
  );

  if (!isDesktopApp) return shell;

  return (
    <div className="flex h-svh flex-col bg-sidebar">
      <WindowTitleBar />
      <div className="relative min-h-0 flex-1 overflow-hidden [transform:translateZ(0)]">{shell}</div>
    </div>
  );
}
