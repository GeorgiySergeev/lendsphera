import { Suspense } from "react";

import { Skeleton } from "@workspace/ui";

import MediaLibrary from "../../../components/media/media-library";

export const metadata = {
  title: "Media Library — Landing Builder"
};

export default function MediaPage() {
  return (
    <Suspense fallback={<MediaPageSkeleton />}>
      <MediaLibrary />
    </Suspense>
  );
}

function MediaPageSkeleton() {
  return (
    <div className="flex h-full gap-4 p-6">
      <Skeleton className="h-full w-60 rounded-lg" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
