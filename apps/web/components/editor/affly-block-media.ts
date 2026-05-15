import type { ComponentListItem } from "@workspace/types";
import {
  BadgePercent,
  ClipboardList,
  Home,
  Megaphone,
  PanelBottom,
  ShieldCheck,
  Star,
  Timer
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getLucideIconForComponentCategory } from "../../lib/component-category-lucide";

const blockIconProps = {
  size: 22,
  strokeWidth: 1.75,
  "aria-hidden": true
} as const satisfies LucideProps;

function lucideBlockSvg(Icon: ComponentType<LucideProps>): string {
  return renderToStaticMarkup(createElement(Icon, { ...blockIconProps }));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML for GrapesJS BlockManager `media` (affly library blocks).
 * Uses `lucide-react` (via renderToStaticMarkup). DB emoji category icons are mapped to Lucide,
 * same rules as `ComponentCategoryIcon` — never raw emoji in the block glyph.
 */
export function buildAfflyBlockMedia(comp: ComponentListItem): string {
  const raw = comp.category.icon?.trim();

  if (raw && (/^https?:\/\//i.test(raw) || raw.startsWith("/"))) {
    return `<img src="${escapeHtml(raw)}" alt="" draggable="false" style="display:block;max-width:28px;max-height:28px;object-fit:contain;" />`;
  }

  const slug = comp.slug.toLowerCase();
  const cat = comp.category.slug.toLowerCase();

  if (slug.includes("countdown") || slug.includes("timer")) {
    return lucideBlockSvg(Timer);
  }

  if (slug.includes("sticky") || slug.includes("bottom-bar")) {
    return lucideBlockSvg(PanelBottom);
  }

  if (slug.includes("hero")) {
    return lucideBlockSvg(Home);
  }

  if (
    slug.includes("quiz") ||
    slug.includes("form") ||
    slug.includes("email") ||
    slug.includes("capture") ||
    slug.includes("phone")
  ) {
    return lucideBlockSvg(ClipboardList);
  }

  if (slug.includes("price") || slug.includes("offer") || slug.includes("bundle")) {
    return lucideBlockSvg(BadgePercent);
  }

  if (
    slug.includes("trust") ||
    slug.includes("logo") ||
    slug.includes("rating") ||
    slug.includes("star")
  ) {
    return lucideBlockSvg(Star);
  }

  if (cat.includes("cta")) {
    return lucideBlockSvg(Megaphone);
  }

  if (cat.includes("trust")) {
    return lucideBlockSvg(ShieldCheck);
  }

  return lucideBlockSvg(getLucideIconForComponentCategory(comp.category));
}
