import { Plus, Library, AlertCircle, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Add", href: "/add", icon: Plus },
  { label: "Library", href: "/library", icon: Library },
  { label: "Errors", href: "/errors", icon: AlertCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href === "/library" && pathname.startsWith("/library"));
}
