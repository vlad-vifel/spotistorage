import { useLocation, useNavigate, Link } from "react-router-dom";
import { Library, Plus, Settings, ChevronsUpDown, Music2, Check, AlertCircle } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfig } from "@/hooks/useConfig";
import { useSwitchLibrary } from "@/hooks/useLibrary";
import { useDownloads } from "@/hooks/useDownloads";

const NAV_ITEMS = [
  { label: "Add", href: "/add", icon: Plus },
  { label: "Library", href: "/library", icon: Library },
  { label: "Errors", href: "/errors", icon: AlertCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const switchLibrary = useSwitchLibrary();
  const { failed } = useDownloads();

  const activeLib = config?.libraries.find((l) => l.id === config.active_library_id);

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
              const isActive = location.pathname === href || (href === "/library" && location.pathname.startsWith("/library"));
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link to={href} className="flex items-center gap-2">
                      <Icon className="size-4" />
                      <span className="flex-1">{label}</span>
                      {href === "/errors" && failed.length > 0 && (
                        <span className="text-xs font-medium rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 tabular-nums">
                          {failed.length}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {activeLib && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-xs">{activeLib.name}</p>
                      <p className="text-xs text-sidebar-foreground/50 truncate">{activeLib.root_path}</p>
                    </div>
                    <ChevronsUpDown className="size-4 text-sidebar-foreground/50 shrink-0 ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel>Libraries</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {config?.libraries.map((lib) => (
                    <DropdownMenuItem
                      key={lib.id}
                      onSelect={() => {
                        if (lib.id !== config.active_library_id) {
                          switchLibrary.mutate({ config, libraryId: lib.id });
                        }
                      }}
                    >
                      <span className="flex-1 truncate">{lib.name}</span>
                      {lib.id === config.active_library_id && <Check className="size-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate("/settings")}>
                    <Plus className="size-4" />
                    Add library folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
