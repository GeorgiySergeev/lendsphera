import type { DashboardWidgetStatus, DashboardWidgetType } from "@workspace/types";

const widgetTypeLabels: Record<DashboardWidgetType, string> = {
  VANILLA_JS: "Vanilla JS",
  REACT: "React",
  IFRAME: "Iframe",
  WEB_COMPONENT: "Web component"
};

const widgetStatusLabels: Record<DashboardWidgetStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  DEPRECATED: "Deprecated"
};

export function formatWidgetType(type: DashboardWidgetType): string {
  return widgetTypeLabels[type] ?? type;
}

export function formatWidgetStatus(status: DashboardWidgetStatus): string {
  return widgetStatusLabels[status] ?? status;
}
