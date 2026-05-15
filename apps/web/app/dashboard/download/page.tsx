import { Download } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function DownloadPage() {
  return (
    <PlaceholderPage
      title="Download"
      description="Export bundles, static drops, and delivery artifacts for landings and widgets."
      badge="Preview"
      icon={Download}
      items={["ZIP exports", "Signed URLs", "Release history"]}
    />
  );
}
