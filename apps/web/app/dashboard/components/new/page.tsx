import { Suspense } from "react";
import { NewComponentClient } from "./_components/NewComponentClient";

export default function NewComponentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Loading editor...</div>}>
      <NewComponentClient />
    </Suspense>
  );
}
