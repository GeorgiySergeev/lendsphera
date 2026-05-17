import { loadLandingRuntimeData } from "../../../lib/loader";
import { cookies } from "next/headers";

export default async function Head({
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
    return null;
  }

  const metaTitle = payload.context.seoMeta?.title ?? payload.title;
  const metaDescription = payload.context.seoMeta?.description ?? payload.description;
  const pixelScripts = buildPixelScripts(payload.context.pixels);

  return (
    <>
      <title>{metaTitle}</title>
      {metaDescription ? <meta name="description" content={metaDescription} /> : null}
      {pixelScripts.map((script, index) => (
        <script key={`pixel-${index + 1}`} dangerouslySetInnerHTML={{ __html: script }} />
      ))}
    </>
  );
}

function buildPixelScripts(pixels: Record<string, string> | null | undefined): string[] {
  if (!pixels) {
    return [];
  }

  return Object.values(pixels)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => (value.startsWith("<script") ? value : `<script>${value}</script>`))
    .map((value) => value.replaceAll(/^<script>|<\/script>$/g, ""));
}
