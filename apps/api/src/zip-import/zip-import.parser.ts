import AdmZip from "adm-zip";
import path from "node:path";
import { parse } from "parse5";
import type {
  ImportedAsset,
  ImportedCodeVariable,
  ImportedDocument,
  ImportedSection,
  ParsedZip
} from "./zip-import.types";

interface P5Node {
  tagName?: string;
  nodeName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: P5Node[];
  value?: string;
  data?: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".bmp",
  ".avif"
]);
const FONT_EXTENSIONS = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogv"]);
const ENTRYPOINT_PATTERN = /(?:^|\/)index\.(?:html?|php)$/i;
const PHP_VARIABLE_PATTERN = /\$([A-Z_][A-Z0-9_]*)\b/g;
const PLACEHOLDER_VARIABLE_PATTERN = /\{\{\s*(LS_[A-Z0-9_]+)\s*\}\}/g;

function getMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  const ext = lower.substring(lower.lastIndexOf("."));

  if (IMAGE_EXTENSIONS.has(ext)) {
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".gif") return "image/gif";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".webp") return "image/webp";
    if (ext === ".ico") return "image/x-icon";
    if (ext === ".bmp") return "image/bmp";
    if (ext === ".avif") return "image/avif";
  }
  if (FONT_EXTENSIONS.has(ext)) {
    if (ext === ".woff") return "font/woff";
    if (ext === ".woff2") return "font/woff2";
    if (ext === ".ttf") return "font/ttf";
    if (ext === ".otf") return "font/otf";
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".webm") return "video/webm";
    if (ext === ".ogv") return "video/ogg";
  }
  if (ext === ".css") return "text/css";
  if (ext === ".js") return "application/javascript";
  if (ext === ".json") return "application/json";
  if (ext === ".html" || ext === ".htm") return "text/html";

  return "application/octet-stream";
}

function isAssetPath(path: string): boolean {
  const lower = path.toLowerCase();
  const ext = lower.substring(lower.lastIndexOf("."));
  return (
    IMAGE_EXTENSIONS.has(ext) ||
    FONT_EXTENSIONS.has(ext) ||
    VIDEO_EXTENSIONS.has(ext) ||
    ext === ".css" ||
    ext === ".js" ||
    ext === ".json"
  );
}

export function parseZipLanding(file: Express.Multer.File): ParsedZip {
  const zip = new AdmZip(file.buffer);
  const entries = zip.getEntries();

  const indexEntry = entries.find((entry) =>
    ENTRYPOINT_PATTERN.test(entry.entryName.replace(/\\/g, "/").replace(/^\.?\//, ""))
  );

  if (!indexEntry) {
    throw new Error("index.html or index.php not found in ZIP archive.");
  }

  const indexHtml = {
    path: indexEntry.entryName,
    content: indexEntry.getData().toString("utf-8")
  };

  const assets: { path: string; content: Buffer; mimeType: string }[] = [];
  const cssFiles: { path: string; content: string }[] = [];
  const allPaths: string[] = [];

  for (const entry of entries) {
    const entryName = entry.entryName;
    allPaths.push(entryName);

    if (entryName === indexEntry.entryName) continue;
    if (entry.isDirectory) continue;

    const data = entry.getData();
    const mimeType = getMimeType(entryName);

    if (entryName.toLowerCase().endsWith(".css")) {
      cssFiles.push({ path: entryName, content: data.toString("utf-8") });
    }

    if (isAssetPath(entryName)) {
      assets.push({ path: entryName, content: data, mimeType });
    }
  }

  return { indexHtml, assets, cssFiles, allPaths };
}

function findNode(node: P5Node, tagName: string): P5Node[] {
  const results: P5Node[] = [];
  if (!node || !node.childNodes) return results;

  for (const child of node.childNodes) {
    if (child.tagName && child.tagName.toLowerCase() === tagName.toLowerCase()) {
      results.push(child);
    }
    results.push(...findNode(child, tagName));
  }

  return results;
}

function getAttr(node: P5Node, name: string): string | undefined {
  if (!node.attrs) return undefined;
  const attr = node.attrs.find((a) => a.name === name);
  return attr?.value;
}

function getTextContent(node: P5Node): string {
  if (!node) return "";
  if (node.nodeName === "#text") return node.value || "";
  if (!node.childNodes) return "";
  return node.childNodes.map(getTextContent).join("");
}

function nodeToHtml(node: P5Node): string {
  if (!node) return "";
  if (node.nodeName === "#text") return node.value || "";
  if (node.nodeName === "#comment") return `<!--${node.data || ""}-->`;

  const tag = node.tagName || "div";
  const attrs = node.attrs
    ? node.attrs.map((a) => `${a.name}="${a.value.replace(/"/g, "&quot;")}"`).join(" ")
    : "";

  const attrStr = attrs ? ` ${attrs}` : "";

  const selfClosing = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]);
  if (selfClosing.has(tag.toLowerCase())) {
    return `<${tag}${attrStr} />`;
  }

  const children = node.childNodes ? node.childNodes.map(nodeToHtml).join("") : "";
  return `<${tag}${attrStr}>${children}</${tag}>`;
}

export function extractDocument(html: string): ImportedDocument {
  const document = parse(html);
  const headNode = findNode(document, "head")[0];
  const bodyNode = findNode(document, "body")[0];

  const head = headNode ? nodeToHtml(headNode) : "";
  const body = bodyNode ? nodeToHtml(bodyNode) : html;

  const linkedCss: string[] = [];
  const inlineCss: string[] = [];
  const scripts: { src?: string; inline?: string; type?: string }[] = [];

  if (headNode) {
    const links = findNode(headNode, "link");
    for (const link of links) {
      const rel = getAttr(link, "rel");
      const href = getAttr(link, "href");
      if (rel === "stylesheet" && href) {
        linkedCss.push(href);
      }
    }

    const styles = findNode(headNode, "style");
    for (const style of styles) {
      inlineCss.push(getTextContent(style));
    }

    const scriptNodes = findNode(headNode, "script");
    for (const script of scriptNodes) {
      const src = getAttr(script, "src");
      const type = getAttr(script, "type");
      const inline = getTextContent(script);
      scripts.push({ src, type, inline: inline || undefined });
    }
  }

  if (bodyNode) {
    const scriptNodes = findNode(bodyNode, "script");
    for (const script of scriptNodes) {
      const src = getAttr(script, "src");
      const type = getAttr(script, "type");
      const inline = getTextContent(script);
      scripts.push({ src, type, inline: inline || undefined });
    }
  }

  return {
    rawHtml: html,
    head,
    body,
    inlineCss,
    linkedCss,
    scripts
  };
}

export function extractSections(
  html: string,
  cssFiles: { path: string; content: string }[]
): ImportedSection[] {
  const sections: ImportedSection[] = [];
  const document = parse(html);
  const bodyNode = findNode(document, "body")[0];

  if (bodyNode && bodyNode.childNodes) {
    let sectionIndex = 0;
    for (const child of bodyNode.childNodes) {
      if (child.nodeName === "#text" && (child.value || "").trim() === "") {
        continue;
      }

      const sectionHtml = nodeToHtml(child);
      if (!sectionHtml.trim()) continue;

      const id = `section-${sectionIndex}`;
      sections.push({
        id,
        type: "html-section",
        name: `Section ${sectionIndex + 1}`,
        html: sectionHtml,
        cssRefs: cssFiles.map((c) => c.path)
      });
      sectionIndex++;
    }
  }

  if (sections.length === 0) {
    sections.push({
      id: "section-0",
      type: "html-section",
      name: "Full HTML",
      html: html,
      cssRefs: cssFiles.map((c) => c.path)
    });
  }

  // Add inline styles as a section
  const headNode = findNode(document, "head")[0];
  if (headNode) {
    const styles = findNode(headNode, "style");
    for (let i = 0; i < styles.length; i++) {
      const css = getTextContent(styles[i]);
      if (css.trim()) {
        sections.push({
          id: `style-${i}`,
          type: "style-section",
          name: `Inline Style ${i + 1}`,
          css,
          cssRefs: []
        });
      }
    }
  }

  return sections;
}

export function extractImportedCodeVariables(html: string): ImportedCodeVariable[] {
  const variables = new Map<string, ImportedCodeVariable>();

  for (const match of html.matchAll(PHP_VARIABLE_PATTERN)) {
    const key = match[1];
    const id = `php:${key}`;
    if (!variables.has(id)) {
      variables.set(id, {
        key,
        source: "php",
        syntax: `$${key}`
      });
    }
  }

  for (const match of html.matchAll(PLACEHOLDER_VARIABLE_PATTERN)) {
    const key = match[1];
    const id = `placeholder:${key}`;
    if (!variables.has(id)) {
      variables.set(id, {
        key,
        source: "placeholder",
        syntax: `{{${key}}}`
      });
    }
  }

  return [...variables.values()].sort((left, right) => {
    if (left.source === right.source) {
      return left.key.localeCompare(right.key);
    }

    return left.source.localeCompare(right.source);
  });
}

export function rewriteAssetUrls(
  htmlPath: string,
  html: string,
  cssFiles: { path: string; content: string }[],
  assetMap: Map<string, string>
): { html: string; css: { path: string; content: string }[] } {
  let rewrittenHtml = rewriteHtmlReferences(html, htmlPath, assetMap);
  const rewrittenCss: { path: string; content: string }[] = [];

  // Rewrite in CSS files
  for (const cssFile of cssFiles) {
    rewrittenCss.push({
      path: cssFile.path,
      content: rewriteCssReferences(cssFile.content, cssFile.path, assetMap)
    });
  }

  return { html: rewrittenHtml, css: rewrittenCss };
}

function rewriteHtmlReferences(
  html: string,
  documentPath: string,
  assetMap: Map<string, string>
) {
  const attrPattern = /\b(src|href|poster)=["']([^"']+)["']/gi;
  let rewritten = html.replace(
    attrPattern,
    (full, attrName: string, rawValue: string) => {
      const resolved = resolveAssetUrl(documentPath, rawValue, assetMap);
      return resolved ? `${attrName}="${resolved}"` : full;
    }
  );

  const styleUrlPattern = /url\((["']?)([^"')]+)\1\)/gi;
  rewritten = rewritten.replace(
    styleUrlPattern,
    (full, quote: string, rawValue: string) => {
      const resolved = resolveAssetUrl(documentPath, rawValue, assetMap);
      return resolved ? `url("${resolved}")` : full;
    }
  );

  return rewritten;
}

function rewriteCssReferences(
  css: string,
  cssPath: string,
  assetMap: Map<string, string>
) {
  const styleUrlPattern = /url\((["']?)([^"')]+)\1\)/gi;

  return css.replace(styleUrlPattern, (full, quote: string, rawValue: string) => {
    const resolved = resolveAssetUrl(cssPath, rawValue, assetMap);
    return resolved ? `url("${resolved}")` : full;
  });
}

function resolveAssetUrl(
  basePath: string,
  rawValue: string,
  assetMap: Map<string, string>
) {
  if (isExternalReference(rawValue)) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const cleanValue = trimmed.split("#")[0]?.split("?")[0] ?? trimmed;
  const normalizedCandidates = new Set<string>();

  const direct = normalizeZipPath(cleanValue);
  if (direct) {
    normalizedCandidates.add(direct);
  }

  const resolvedRelative = resolveRelativeZipPath(basePath, cleanValue);
  if (resolvedRelative) {
    normalizedCandidates.add(resolvedRelative);
  }

  const parsedUrl = parseAssetUrl(cleanValue);
  if (parsedUrl) {
    const pathname = parsedUrl.pathname ?? "";
    const normalizedPath = normalizeZipPath(pathname);
    if (normalizedPath) {
      normalizedCandidates.add(normalizedPath);
    }
  }

  for (const candidate of normalizedCandidates) {
    const assetUrl = assetMap.get(candidate);
    if (assetUrl) {
      return assetUrl;
    }
  }

  const lowerCleanValue = cleanValue.toLowerCase();
  for (const [assetPath, assetUrl] of assetMap.entries()) {
    const lowerAssetPath = assetPath.toLowerCase();
    if (
      lowerCleanValue === lowerAssetPath ||
      lowerCleanValue.endsWith(`/${lowerAssetPath}`) ||
      lowerCleanValue.endsWith(lowerAssetPath)
    ) {
      return assetUrl;
    }
  }

  return null;
}

function resolveRelativeZipPath(basePath: string, relativePath: string) {
  const baseDir = path.posix.dirname(basePath.replace(/\\/g, "/"));
  return normalizeZipPath(path.posix.normalize(path.posix.join(baseDir, relativePath)));
}

function normalizeZipPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\.?\//, "");
  if (!normalized || normalized.startsWith("../")) {
    return null;
  }
  return normalized;
}

function parseAssetUrl(value: string) {
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      return new URL(value);
    }

    if (value.startsWith("//")) {
      return new URL(`https:${value}`);
    }
  } catch {
    return null;
  }

  return null;
}

function isExternalReference(value: string) {
  return /^(?:data:|#|javascript:|mailto:|tel:)/i.test(value);
}

export function buildAssetMap(
  assets: ImportedAsset[],
  getStorageUrl: (key: string) => string
): Map<string, string> {
  const map = new Map<string, string>();
  for (const asset of assets) {
    if (asset.s3Key) {
      const url = getStorageUrl(asset.s3Key);
      map.set(asset.path, url);
    }
  }
  return map;
}
