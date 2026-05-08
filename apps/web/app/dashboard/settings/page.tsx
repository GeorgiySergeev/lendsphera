import { Settings } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Prepare workspace preferences, access controls, and integration configuration."
      badge="Admin"
      icon={Settings}
      items={["Workspace profile", "Access policy", "API integrations"]}
    />
  );
}
