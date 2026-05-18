import Link from "next/link";

import { Button } from "@workspace/ui";

export default function RuntimeIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-5">
      <p className="text-sm font-medium uppercase tracking-normal text-primary">
        Runtime
      </p>
      <h1 className="text-4xl font-semibold tracking-normal">
        Published landing renderer
      </h1>
      <p className="text-base leading-7 text-muted-foreground">
        The runtime app is isolated from the dashboard and renders landing documents by
        slug.
      </p>
      <Button asChild className="w-fit">
        <Link href="/demo">View demo landing</Link>
      </Button>
    </main>
  );
}
