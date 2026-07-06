import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name resolved in the client
  roles?: Role[]; // if set, only these roles see it
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/copilot", label: "AI Copilot", icon: "Sparkles" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/crm", label: "CRM", icon: "Users" },
      { href: "/inventory", label: "Inventory", icon: "Boxes" },
      { href: "/finance", label: "Finance", icon: "Receipt" },
      { href: "/hr", label: "HR", icon: "Briefcase" },
      { href: "/projects", label: "Projects", icon: "FolderKanban" },
    ],
  },
  {
    label: "Insight",
    items: [
      { href: "/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/documents", label: "Documents", icon: "FileText" },
      { href: "/knowledge-base", label: "Knowledge Base", icon: "BookOpen" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/notifications", label: "Notifications", icon: "Bell" },
      { href: "/settings", label: "Settings", icon: "Settings", roles: ["owner", "admin"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

export function visibleNav(role: Role): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}
