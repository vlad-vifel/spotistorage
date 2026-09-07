import { useLocation, Link } from "react-router-dom";
import { Music2 } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDownloads } from "@/hooks/useDownloads";
import { NAV_ITEMS, isNavActive } from "./navItems";
import { NavErrorBadge } from "./NavErrorBadge";

export function AppSidebar() {
  const location = useLocation();
  const { failed } = useDownloads();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link to="/add" className="flex items-center gap-2 px-2 py-1">
          <Music2 className="size-5 text-foreground" />
          <span className="font-semibold text-sm text-foreground">SpotiStorage</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const isActive = isNavActive(location.pathname, href);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link to={href} className="flex items-center gap-2">
                      <Icon className="size-4" />
                      <span className="flex-1">{label}</span>
                      {href === "/errors" && failed.length > 0 && (
                        <NavErrorBadge count={failed.length} />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
