import { Suspense } from "react";
import { notFound } from "next/navigation";

import { EditWidgetClient } from "./_components/EditWidgetClient";

export default async function EditWidgetPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;

  if (!resolved.id) {
    notFound();
  }

  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}
    >
      <EditWidgetClient widgetId={resolved.id} />
    </Suspense>
  );
}
