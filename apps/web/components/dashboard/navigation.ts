import {
  Blocks,
  Database,
  Download,
  FileStack,
  Images,
  Languages,
  LayoutGrid,
  LayoutTemplate,
  Settings,
  ShieldAlert,
  Tags,
  Wrench,
  MoveUpRight,
  House,
  SquaresExclude
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

const dashboardNavItems: DashboardNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: House },
  { title: "Landings", href: "/dashboard/landings", icon: FileStack, badge: "18" },
  { title: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, badge: "9" },
  { title: "Builder", href: "/dashboard/builder", icon: Wrench },
  { title: "Editor", href: "/dashboard/editor", icon: SquaresExclude },
  { title: "Download", href: "/dashboard/download", icon: Download },
  { title: "Localization", href: "/dashboard/localization", icon: Languages },
  { title: "Compliance", href: "/dashboard/compliance", icon: ShieldAlert },
  { title: "Widgets", href: "/dashboard/widgets", icon: Blocks },
  { title: "Component Library", href: "/dashboard/components", icon: LayoutGrid },
  { title: "Repository", href: "/dashboard/repository", icon: Database },
  { title: "Media Library", href: "/dashboard/media", icon: Images },
  { title: "Taxonomy", href: "/dashboard/taxonomy", icon: Tags },
  { title: "Legacy", href: "/landings", icon: MoveUpRight },
  { title: "Audit", href: "/dashboard/audit", icon: MoveUpRight },
  { title: "Settings", href: "/dashboard/settings", icon: Settings }
];

export { dashboardNavItems };
export type { DashboardNavItem };
