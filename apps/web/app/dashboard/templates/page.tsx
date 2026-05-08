import { LayoutTemplate } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function TemplatesPage() {
  return (
    <PlaceholderPage
      title="Templates"
      description="Maintain reusable page structures and prepare them for landing creation."
      badge="9 active"
      icon={LayoutTemplate}
      items={["Template inventory", "Usage analytics", "Version readiness"]}
    />
  );
}
