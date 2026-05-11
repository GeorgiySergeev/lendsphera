import { Suspense } from "react";

import { Skeleton } from "@workspace/ui";

import { ComponentsPageClient } from "./_components/ComponentsPageClient";

export default function ComponentsPage() {
  return (
    <Suspense fallback={<ComponentsPageFallback />}>
      <ComponentsPageClient />
    </Suspense>
  );
}

function ComponentsPageFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="sticky top-16 z-20 flex h-14 items-center justify-between border-b bg-background px-6">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid lg:grid-cols-[240px_1fr]">
        <div className="hidden border-r p-4 lg:block">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-6 h-80 w-full" />
        </div>
        <div className="p-6">
          <Skeleton className="h-11 w-full" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
