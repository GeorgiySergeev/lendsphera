import { minify } from "html-minifier-terser";
import { transform } from "lightningcss";

import { extractImportedLanding } from "../zip-import/imported-landing.utils";

type RenderVersionInput = {
  css?: string | null;
  customCss?: string | null;
  customJs?: string | null;
  grapesJson?: unknown;
  html?: string | null;
};

const widgetLoaderScript = `<script src="/widget-loader.js" async></script>`;

async function renderVersionHtml(input: RenderVersionInput) {
  const sourceHtml = resolveSourceHtml(input);
  const finalCss = [input.css?.trim(), input.customCss?.trim()]
    .filter(Boolean)
    .join("\n");
  const minifiedCss = transform({
    filename: "style.css",
    code: Buffer.from(finalCss),
    minify: true,
    sourceMap: false
  }).code.toString();

  let html = injectIntoHead(sourceHtml, `<style>${minifiedCss}</style>`);

  if (input.customJs?.trim()) {
    html = injectBeforeBodyEnd(html, `<script>${input.customJs.trim()}</script>`);
  }

  if (needsWidgetLoader(html)) {
    html = injectBeforeBodyEnd(html, widgetLoaderScript);
  }

  return minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true
  });
}

function resolveSourceHtml(input: RenderVersionInput) {
  const importedLanding = extractImportedLanding(input.grapesJson);
  const importedHtml = importedLanding?.document?.rawHtml?.trim();

  if (importedHtml) {
    return importedHtml;
  }

  return input.html?.trim() || "<!DOCTYPE html><html><head></head><body></body></html>";
}
function injectIntoHead(html: string, markup: string) {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${markup}</head>`);
  }

  if (/<body\b/i.test(html)) {
    return html.replace(/<body\b[^>]*>/i, (match) => `<head>${markup}</head>${match}`);
  }

  if (/<html\b/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${markup}</head>`);
  }

  return `<!DOCTYPE html><html><head>${markup}</head><body>${html}</body></html>`;
}

function injectBeforeBodyEnd(html: string, markup: string) {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${markup}</body>`);
  }

  if (/<\/html>/i.test(html)) {
    return html.replace(/<\/html>/i, `${markup}</html>`);
  }

  return `${html}${markup}`;
}

function needsWidgetLoader(html: string) {
  return /data-widget(?:=|-)["']?/i.test(html);
}

export { renderVersionHtml };
