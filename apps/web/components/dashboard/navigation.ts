import {
  Blocks,
  Database,
  FileStack,
  LayoutGrid,
  LayoutTemplate,
  Settings,
  Tags
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

const dashboardNavItems: DashboardNavItem[] = [
  { title: "Landings", href: "/dashboard/landings", icon: FileStack, badge: "18" },
  { title: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, badge: "9" },
  { title: "Widgets", href: "/dashboard/widgets", icon: Blocks, badge: "34" },
  { title: "Component Library", href: "/dashboard/components", icon: LayoutGrid },
  { title: "Repository", href: "/dashboard/repository", icon: Database },
  { title: "Taxonomy", href: "/dashboard/taxonomy", icon: Tags },
  { title: "Settings", href: "/dashboard/settings", icon: Settings }
];

export { dashboardNavItems };
export type { DashboardNavItem };
