import { ArrowRight, Blocks, Database, Rocket } from "lucide-react";
import Link from "next/link";

import { createWidgetSdk } from "@workspace/widgets";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui";
import type { LandingDocument } from "@workspace/types";

const sampleLanding: LandingDocument = {
  id: "landing_demo",
  slug: "spring-campaign",
  title: "Spring Campaign",
  description: "A typed sample document flowing through shared packages.",
  publishedAt: null,
  widgets: [
    { id: "hero", type: "hero", order: 0, props: { heading: "Lead capture hero" } },
    { id: "cta", type: "cta", order: 1, props: { heading: "Book a demo" } }
  ]
};

const sdk = createWidgetSdk(sampleLanding);

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-12">
        <div className="flex flex-col justify-center gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
            Buildable monorepo scaffold
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              Landing builder workspace ready for product work.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Next.js, NestJS, Prisma, shared UI, typed schemas, and widget SDK are wired
              together so the next step can focus on real builder behavior.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">
                Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline">Review infrastructure</Button>
          </div>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Workspace status</CardTitle>
            <CardDescription>
              Shared packages are consumed from the app shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow
              icon={<Blocks className="h-4 w-4" />}
              label="Widgets"
              value={sdk.listWidgets().length}
            />
            <StatusRow
              icon={<Database className="h-4 w-4" />}
              label="API health"
              value="GET /health"
            />
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">{sampleLanding.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sampleLanding.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function StatusRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
