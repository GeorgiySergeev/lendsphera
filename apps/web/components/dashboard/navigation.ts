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
  Tags,
  Wrench
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
  { title: "Builder", href: "/dashboard/builder", icon: Wrench },
  { title: "Download", href: "/dashboard/download", icon: Download },
  { title: "Localization", href: "/dashboard/localization", icon: Languages },
  { title: "Widgets", href: "/dashboard/widgets", icon: Blocks },
  { title: "Component Library", href: "/dashboard/components", icon: LayoutGrid },
  { title: "Repository", href: "/dashboard/repository", icon: Database },
  { title: "Media Library", href: "/dashboard/media", icon: Images },
  { title: "Taxonomy", href: "/dashboard/taxonomy", icon: Tags },
  { title: "Settings", href: "/dashboard/settings", icon: Settings }
];

export { dashboardNavItems };
export type { DashboardNavItem };
