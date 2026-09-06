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
import { useDownloadNotifications } from "@/hooks/useDownloadNotifications";
import { useSource } from "@/hooks/useSources";

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
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              <BreadcrumbItem>
                {i < crumbs.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href!}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
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

  return (
    <SidebarProvider className="h-svh! min-h-0! overflow-hidden" style={{ "--sidebar-width": "188px" } as CSSProperties}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 border-b border-border/50">
          <SidebarTrigger className="-ml-1" />
          <AppBreadcrumbs />
          {lastBatch && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-xs">
              {lastBatch.failed > 0 ? (
                <AlertCircle className="size-3 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
              )}
              <span className="text-muted-foreground tabular-nums">
                {lastBatch.done > 0 && `${lastBatch.done} downloaded`}
                {lastBatch.done > 0 && lastBatch.failed > 0 && " - "}
                {lastBatch.failed > 0 && `${lastBatch.failed} failed`}
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
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="px-6">
            <Outlet />
          </div>
        </div>
        <DownloadBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
