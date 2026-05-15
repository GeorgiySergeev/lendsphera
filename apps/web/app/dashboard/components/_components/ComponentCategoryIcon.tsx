"use client";

import { getLucideIconForComponentCategory } from "../../../../lib/component-category-lucide";
import { cn } from "@workspace/ui";

export type ComponentCategoryIconProps = {
  slug?: string | null;
  icon?: string | null;
  className?: string;
};

function ComponentCategoryIcon({ slug, icon, className }: ComponentCategoryIconProps) {
  const Icon = getLucideIconForComponentCategory({ slug: slug ?? "", icon });

  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden />;
}

export { ComponentCategoryIcon };
