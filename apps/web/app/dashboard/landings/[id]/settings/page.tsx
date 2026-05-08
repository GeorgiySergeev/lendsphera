import { Settings } from "lucide-react";

import { PlaceholderPage } from "../../../../../components/dashboard/placeholder-page";

export default function LandingSettingsPage() {
  return (
    <PlaceholderPage
      title="Landing settings"
      description="Configure landing metadata, tracking, SEO, and publishing options."
      badge="Settings"
      icon={Settings}
      items={["SEO metadata", "Tracking pixels", "Publishing rules"]}
    />
  );
}
