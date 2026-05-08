import { Blocks } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function WidgetsPage() {
  return (
    <PlaceholderPage
      title="Widgets"
      description="Inspect composable modules, schema coverage, and production readiness."
      badge="34 modules"
      icon={Blocks}
      items={["Schema status", "Preview coverage", "Compatibility checks"]}
    />
  );
}
