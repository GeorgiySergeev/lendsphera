import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Compass,
  Folder,
  LayoutTemplate,
  Megaphone,
  MessageSquare,
  Shield,
  Target,
  Zap
} from "lucide-react";

/** Seeded / legacy DB values: emoji category icons → Lucide. */
const EMOJI_ICONS: Record<string, LucideIcon> = {
  "🦸": LayoutTemplate,
  "🎯": Target,
  "⚡": Zap,
  "📋": ClipboardList,
  "🛡": Shield,
  "📊": BarChart3,
  "💬": MessageSquare,
  "📢": Megaphone,
  "🧭": Compass
};

const SLUG_ICONS: Record<string, LucideIcon> = {
  heroes: LayoutTemplate,
  offer: Target,
  ctas: Zap,
  forms: ClipboardList,
  trust: Shield,
  stats: BarChart3,
  testimonials: MessageSquare,
  banners: Megaphone,
  navigation: Compass
};

export type ComponentCategoryLike = {
  slug: string;
  icon?: string | null;
};

/** Same resolution as dashboard `ComponentCategoryIcon` (emoji first, then slug, then folder). */
export function getLucideIconForComponentCategory(
  category: ComponentCategoryLike
): LucideIcon {
  const trimmed = category.icon?.trim();
  const fromEmoji = trimmed ? EMOJI_ICONS[trimmed] : undefined;
  const slug = category.slug.toLowerCase();
  const fromSlug = SLUG_ICONS[slug];

  return fromEmoji ?? fromSlug ?? Folder;
}

/** Remove leading category emoji from API name so block label does not duplicate the Lucide glyph. */
export function stripCategoryIconPrefixFromName(
  name: string,
  icon?: string | null
): string {
  const n = name.trim();
  const ic = icon?.trim();
  if (!ic || !n.startsWith(ic)) {
    return name;
  }

  return n.slice(ic.length).trimStart() || name;
}
