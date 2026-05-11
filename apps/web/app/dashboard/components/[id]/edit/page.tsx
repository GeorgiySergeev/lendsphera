import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ComponentEditorClient } from "./_components/ComponentEditorClient";

export default async function ComponentEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  if (!resolvedParams.id) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Loading editor...</div>}>
      <ComponentEditorClient componentId={resolvedParams.id} />
    </Suspense>
  );
}
