import { Languages } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function LocalizationPage() {
  return (
    <PlaceholderPage
      title="Localization"
      description="Manage locales, copy catalogs, and geo-aware strings across the workspace."
      badge="Preview"
      icon={Languages}
      items={["Locale matrix", "String review", "Geo fallbacks"]}
    />
  );
}
