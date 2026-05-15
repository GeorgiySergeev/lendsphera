import { Images } from "lucide-react";

import { PlaceholderPage } from "../../../components/dashboard/placeholder-page";

export default function MediaPage() {
  return (
    <PlaceholderPage
      title="Media"
      description="Central library for images, video, and documents used across landings and components."
      badge="Preview"
      icon={Images}
      items={["Asset library", "Variants & crops", "Usage map"]}
    />
  );
}
