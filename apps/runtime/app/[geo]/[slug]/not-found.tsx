import Link from "next/link";

export default function RuntimeNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm font-medium uppercase text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Landing not found</h1>
      <p className="text-sm text-muted-foreground">
        We could not find a published landing for this GEO and slug.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline underline-offset-2"
      >
        Back to runtime home
      </Link>
    </main>
  );
}
