import { renderWidget } from "@workspace/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui";
import { LandingDocumentSchema } from "@workspace/types";

import { WidgetRuntimeLoader } from "../widget-runtime-loader";

const demoDocument = LandingDocumentSchema.parse({
  id: "landing_demo",
  slug: "demo-landing",
  title: "Demo Landing",
  description: "This page is rendered by the isolated runtime app.",
  publishedAt: new Date().toISOString(),
  widgets: [
    {
      id: "hero",
      type: "hero",
      order: 0,
      props: {
        heading: "Launch pages with confidence",
        body: "Typed widgets render here."
      }
    },
    {
      id: "features",
      type: "features",
      order: 1,
      props: { heading: "Shared SDK", body: "The runtime consumes packages/widgets." }
    }
  ]
});

export default function RuntimeDemoPage() {
  return (
    <main className="min-h-screen bg-background">
      <WidgetRuntimeLoader />
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-10 sm:px-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-normal text-primary">
            /demo
          </p>
          <h1 className="text-4xl font-semibold tracking-normal">{demoDocument.title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {demoDocument.description}
          </p>
        </div>

        <div className="grid gap-4">
          {demoDocument.widgets
            .sort((a, b) => a.order - b.order)
            .map((widget) => {
              const rendered = renderWidget(widget);

              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle>{rendered.type}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: rendered.html }}
                    />
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>
    </main>
  );
}
