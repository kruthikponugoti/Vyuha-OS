import {
  LayoutDashboard, Sparkles, Users, Boxes, Receipt, Briefcase, FolderKanban,
  BarChart3, FileText, BookOpen, Bell, Settings, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Sparkles, Users, Boxes, Receipt, Briefcase, FolderKanban,
  BarChart3, FileText, BookOpen, Bell, Settings,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
