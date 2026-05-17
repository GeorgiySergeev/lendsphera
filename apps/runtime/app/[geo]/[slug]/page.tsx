import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { renderTree } from "@workspace/widgets";

import { WidgetRuntimeLoader } from "../../widget-runtime-loader";
import { loadLandingRuntimeData } from "../../../lib/loader";

export const revalidate = 300;

export default async function RuntimeLandingPage({
  params,
  searchParams
}: {
  params: Promise<{ geo: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { geo, slug } = await params;
  const query = await searchParams;
  const previewFromCookie = (await cookies()).get("ls_preview_token")?.value ?? null;
  const previewToken =
    typeof query.preview === "string" ? query.preview : previewFromCookie;
  const payload = await loadLandingRuntimeData(geo, slug, previewToken);

  if (!payload) {
    notFound();
  }

  const nodes = renderTree(payload.snapshot.specs, payload.renderContext);

  return (
    <main className="min-h-screen bg-background">
      {payload.needsWidgetRuntimeLoader ? <WidgetRuntimeLoader /> : null}
      <article className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {nodes.map((node) => (
          <section
            key={node.id}
            data-widget-kind={node.kind}
            dangerouslySetInnerHTML={{ __html: node.html }}
          />
        ))}
      </article>
    </main>
  );
}
