import { Suspense } from "react";

import { LandingsTablePage } from "../../../components/dashboard/landings-table-page";
import { Skeleton } from "@workspace/ui";

export default function LandingsPage() {
  return (
    <Suspense fallback={<LandingsFallback />}>
      <LandingsTablePage />
    </Suspense>
  );
}

function LandingsFallback() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
