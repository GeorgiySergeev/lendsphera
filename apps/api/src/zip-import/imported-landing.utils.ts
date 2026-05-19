import path from "node:path";

import type { ImportedAsset, ImportedLanding } from "./zip-import.types";

type ResolveImportedAssetUrlOptions = {
  assetToken?: string;
  landingId?: string;
};

type ImportedLandingHtmlSection = {
  id: string;
  html: string;
};

type EditorAsset = {
  id: string;
  mimeType?: string;
  name: string;
  size?: number;
  src: string;
  type: "document" | "image" | "video";
};

function extractImportedLanding(input: unknown): ImportedLanding | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const root = input as Record<string, unknown>;
  const candidate = root.importedLanding;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const importedLanding = candidate as ImportedLanding;

  if (
    importedLanding.renderMode !== "universal-sections" ||
    !Array.isArray(importedLanding.sections) ||
    !importedLanding.document ||
    typeof importedLanding.document !== "object"
  ) {
    return null;
  }

  return importedLanding;
}

function getImportedLandingHtmlSections(
  importedLanding: ImportedLanding
): ImportedLandingHtmlSection[] {
  const sections = importedLanding.sections
    .filter(
      (section): section is ImportedLanding["sections"][number] & { html: string } =>
        section.type === "html-section" &&
        typeof section.html === "string" &&
        section.html.trim().length > 0
    )
    .map((section) => ({
      id: section.id,
      html: rewriteImportedAssetUrls(
        importedLanding,
        section.html,
        importedLanding.entrypoint
      )
    }));

  if (sections.length > 0) {
    return sections;
  }

  const bodyHtml = extractBodyInnerHtml(importedLanding.document.body);

  if (bodyHtml) {
    return [{ id: "section-0", html: bodyHtml }];
  }

  const rawHtml = importedLanding.document.rawHtml?.trim();

  return rawHtml
    ? [
        {
          id: "section-0",
          html: rewriteImportedAssetUrls(
            importedLanding,
            rawHtml,
            importedLanding.entrypoint
          )
        }
      ]
    : [];
}

function collectImportedAssetPathCandidates(basePath: string, rawValue: string) {
  const trimmed = rawValue.trim();
  const cleanValue = trimmed.split("#")[0]?.split("?")[0] ?? trimmed;
  const candidates = new Set<string>();

  const direct = normalizeZipPath(cleanValue);
  if (direct) {
    candidates.add(direct);
  }

  const relative = resolveRelativeZipPath(basePath, cleanValue);
  if (relative) {
    candidates.add(relative);
  }

  const parsedUrl = parseAssetUrl(cleanValue);
  if (parsedUrl) {
    const pathname = parsedUrl.pathname ?? "";
    const normalizedPath = normalizeZipPath(pathname);
    if (normalizedPath) {
      candidates.add(normalizedPath);
    }

    const bucketMarker = "/assets/";
    const bucketIndex = pathname.indexOf(bucketMarker);
    if (bucketIndex >= 0) {
      const fromAssets = normalizeZipPath(
        pathname.slice(bucketIndex + bucketMarker.length)
      );
      if (fromAssets) {
        candidates.add(fromAssets);
      }
    }
  }

  return [...candidates];
}

async function buildImportedLandingEditorStyles(
  landingId: string,
  importedLanding: ImportedLanding,
  assetToken: string,
  readAssetBuffer: (s3Key: string) => Promise<Buffer>,
  fallbackCss?: string | null
): Promise<string> {
  const options = { landingId, assetToken };
  const inlinedLinkedCss = await Promise.all(
    importedLanding.document.linkedCss.map(async (assetPath) => {
      const candidates = collectImportedAssetPathCandidates(
        importedLanding.entrypoint,
        assetPath
      );
      const asset = findImportedAsset(importedLanding, candidates);
      if (!asset?.s3Key) {
        return "";
      }

      const buffer = await readAssetBuffer(asset.s3Key);
      return rewriteImportedCssUrls(
        importedLanding,
        buffer.toString("utf-8"),
        asset.path,
        options
      );
    })
  );

  const parts = [
    ...inlinedLinkedCss,
    ...importedLanding.document.inlineCss.map((css) =>
      rewriteImportedCssUrls(importedLanding, css, importedLanding.entrypoint, options)
    ),
    ...importedLanding.sections
      .filter(
        (section) => section.type === "style-section" && typeof section.css === "string"
      )
      .map((section) =>
        rewriteImportedCssUrls(
          importedLanding,
          section.css as string,
          importedLanding.entrypoint,
          options
        )
      )
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  const mergedImportedCss = parts.join("\n\n");
  const nextFallbackCss = fallbackCss?.trim() ?? "";

  if (mergedImportedCss && nextFallbackCss && mergedImportedCss !== nextFallbackCss) {
    return `${mergedImportedCss}\n\n${nextFallbackCss}`;
  }

  return mergedImportedCss || nextFallbackCss || "";
}

function getImportedLandingCssText(
  importedLanding: ImportedLanding,
  fallbackCss?: string | null,
  options?: ResolveImportedAssetUrlOptions
) {
  const linkedCssImports = importedLanding.document.linkedCss
    .map((assetPath) =>
      resolveImportedAssetUrl(
        importedLanding,
        importedLanding.entrypoint,
        assetPath,
        options
      )
    )
    .filter((assetUrl): assetUrl is string => Boolean(assetUrl))
    .map((assetUrl) => `@import url("${assetUrl}");`);

  const parts = [
    ...linkedCssImports,
    ...importedLanding.document.inlineCss.map((css) =>
      rewriteImportedCssUrls(importedLanding, css, importedLanding.entrypoint, options)
    ),
    ...importedLanding.sections
      .filter(
        (section) => section.type === "style-section" && typeof section.css === "string"
      )
      .map((section) =>
        rewriteImportedCssUrls(
          importedLanding,
          section.css as string,
          importedLanding.entrypoint,
          options
        )
      )
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  const mergedImportedCss = parts.join("\n\n");
  const nextFallbackCss = fallbackCss?.trim() ?? "";

  if (mergedImportedCss && nextFallbackCss && mergedImportedCss !== nextFallbackCss) {
    return `${mergedImportedCss}\n\n${nextFallbackCss}`;
  }

  return mergedImportedCss || nextFallbackCss || "";
}

function extractBodyInnerHtml(bodyHtml: string | undefined) {
  if (!bodyHtml) {
    return "";
  }

  const match = bodyHtml.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return (match?.[1] ?? bodyHtml).trim();
}

function buildImportedLandingEditorProject(
  landingId: string,
  importedLanding: ImportedLanding,
  assetToken: string,
  fallbackCss?: string | null,
  stylesOverride?: string
) {
  const rewriteOptions = { landingId, assetToken };
  const bodyHtml =
    extractBodyInnerHtml(importedLanding.document.body) ||
    importedLanding.document.rawHtml;
  const headScripts = buildImportedHeadScriptMarkup(importedLanding, rewriteOptions);
  const componentMarkup = `${headScripts}${rewriteImportedAssetUrls(
    importedLanding,
    bodyHtml,
    importedLanding.entrypoint,
    rewriteOptions
  )}`;
  const pageStyles =
    stylesOverride ??
    getImportedLandingCssText(importedLanding, fallbackCss, rewriteOptions);

  return {
    assets: mapImportedLandingAssetsForEditor(landingId, importedLanding, assetToken),
    pages: [
      {
        name: "Home",
        component: componentMarkup,
        styles: pageStyles,
        frames: [
          {
            component: {
              content: componentMarkup
            }
          }
        ]
      }
    ]
  };
}

function buildImportedLandingAssetProxyUrl(
  landingId: string,
  assetPath: string,
  assetToken: string
): string {
  const encodedPath = assetPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const token = encodeURIComponent(assetToken);

  // Same-origin relative URL so canvas images work on any dev host (localhost vs 127.0.0.1).
  return `/api/landings/${encodeURIComponent(landingId)}/assets/${encodedPath}?token=${token}`;
}

function buildImportedHeadScriptMarkup(
  importedLanding: ImportedLanding,
  options: ResolveImportedAssetUrlOptions
) {
  return importedLanding.document.scripts
    .map((script) => {
      if (!script.src?.trim()) {
        return "";
      }

      const resolved = resolveImportedAssetUrl(
        importedLanding,
        importedLanding.entrypoint,
        script.src,
        options
      );

      if (!resolved) {
        return "";
      }

      const typeAttr = script.type ? ` type="${script.type}"` : "";
      return `<script src="${resolved}"${typeAttr}></script>`;
    })
    .filter(Boolean)
    .join("");
}

function mapImportedLandingAssetsForEditor(
  landingId: string,
  importedLanding: ImportedLanding,
  assetToken: string
): EditorAsset[] {
  return importedLanding.assets
    .filter((asset) => Boolean(asset.path?.trim()))
    .map((asset) => ({
      id: asset.s3Key ?? asset.path,
      mimeType: asset.mimeType,
      name: asset.path.split("/").pop() ?? asset.path,
      size: asset.size,
      src: buildImportedLandingAssetProxyUrl(landingId, asset.path, assetToken),
      type: toEditorAssetType(asset.mimeType)
    }));
}

function toEditorAssetType(mimeType: string | undefined): "document" | "image" | "video" {
  if (mimeType?.startsWith("video/")) {
    return "video";
  }

  if (mimeType?.startsWith("image/")) {
    return "image";
  }

  return "document";
}

function rewriteImportedAssetUrls(
  importedLanding: ImportedLanding,
  html: string | undefined,
  basePath: string,
  options?: ResolveImportedAssetUrlOptions
) {
  if (!html?.trim()) {
    return "";
  }

  const attrPattern = /\b(src|href|poster)=["']([^"']+)["']/gi;
  const withAttrs = html.replace(
    attrPattern,
    (full, attrName: string, rawValue: string) => {
      const resolved = resolveImportedAssetUrl(
        importedLanding,
        basePath,
        rawValue,
        options
      );
      return resolved ? `${attrName}="${resolved}"` : full;
    }
  );

  return rewriteImportedCssUrls(importedLanding, withAttrs, basePath, options);
}

function rewriteImportedCssUrls(
  importedLanding: ImportedLanding,
  content: string,
  basePath: string,
  options?: ResolveImportedAssetUrlOptions
) {
  const styleUrlPattern = /url\((["']?)([^"')]+)\1\)/gi;

  return content.replace(styleUrlPattern, (full, quote: string, rawValue: string) => {
    const resolved = resolveImportedAssetUrl(
      importedLanding,
      basePath,
      rawValue,
      options
    );
    return resolved ? `url("${resolved}")` : full;
  });
}

function findImportedAsset(
  importedLanding: ImportedLanding,
  candidates: Iterable<string>
): ImportedAsset | undefined {
  const candidateList = [...candidates].filter(Boolean);
  if (!candidateList.length) {
    return undefined;
  }

  for (const candidate of candidateList) {
    const exact = importedLanding.assets.find((item) => item.path === candidate);
    if (exact) {
      return exact;
    }
  }

  for (const candidate of candidateList) {
    const suffixMatch = importedLanding.assets.find(
      (item) => item.path.endsWith(`/${candidate}`) || item.path === candidate
    );
    if (suffixMatch) {
      return suffixMatch;
    }
  }

  const basename = path.posix.basename(candidateList[0] ?? "");
  if (!basename || basename === "." || basename === "..") {
    return undefined;
  }

  const basenameMatches = importedLanding.assets.filter(
    (item) => path.posix.basename(item.path) === basename
  );

  if (basenameMatches.length === 1) {
    return basenameMatches[0];
  }

  if (basenameMatches.length > 1) {
    const entryDir = path.posix.dirname(importedLanding.entrypoint.replace(/\\/g, "/"));
    const scopedMatches = basenameMatches.filter((item) => {
      if (entryDir === ".") {
        return !item.path.includes("/");
      }

      return item.path.startsWith(`${entryDir}/`) || item.path === entryDir;
    });

    if (scopedMatches.length === 1) {
      return scopedMatches[0];
    }
  }

  return undefined;
}

function toImportedAssetPublicUrl(
  asset: ImportedAsset,
  options?: ResolveImportedAssetUrlOptions
) {
  if (options?.landingId && options.assetToken) {
    return buildImportedLandingAssetProxyUrl(
      options.landingId,
      asset.path,
      options.assetToken
    );
  }

  return asset.url ?? null;
}

function resolveImportedAssetUrl(
  importedLanding: ImportedLanding,
  basePath: string,
  rawValue: string,
  options?: ResolveImportedAssetUrlOptions
) {
  if (isExternalReference(rawValue)) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const cleanValue = trimmed.split("#")[0]?.split("?")[0] ?? trimmed;
  const candidates = new Set<string>();

  const direct = normalizeZipPath(cleanValue);
  if (direct) {
    candidates.add(direct);
  }

  const relative = resolveRelativeZipPath(basePath, cleanValue);
  if (relative) {
    candidates.add(relative);
  }

  const parsedUrl = parseAssetUrl(cleanValue);
  if (parsedUrl) {
    const pathname = parsedUrl.pathname ?? "";
    const normalizedPath = normalizeZipPath(pathname);
    if (normalizedPath) {
      candidates.add(normalizedPath);
    }

    const bucketMarker = "/assets/";
    const bucketIndex = pathname.indexOf(bucketMarker);
    if (bucketIndex >= 0) {
      const fromAssets = normalizeZipPath(
        pathname.slice(bucketIndex + bucketMarker.length)
      );
      if (fromAssets) {
        candidates.add(fromAssets);
      }
    }
  }

  const matchedAsset = findImportedAsset(importedLanding, candidates);
  if (matchedAsset) {
    return toImportedAssetPublicUrl(matchedAsset, options);
  }

  const lowerCleanValue = cleanValue.toLowerCase();
  for (const asset of importedLanding.assets) {
    const lowerAssetPath = asset.path.toLowerCase();
    if (
      lowerCleanValue === lowerAssetPath ||
      lowerCleanValue.endsWith(`/${lowerAssetPath}`) ||
      lowerCleanValue.endsWith(lowerAssetPath)
    ) {
      return toImportedAssetPublicUrl(asset, options);
    }

    if (asset.url) {
      const lowerAssetUrl = asset.url.toLowerCase();
      if (
        lowerCleanValue === lowerAssetUrl ||
        lowerCleanValue.endsWith(lowerAssetPath) ||
        lowerCleanValue.includes(`/${lowerAssetPath}`)
      ) {
        return toImportedAssetPublicUrl(asset, options);
      }
    }
  }

  return null;
}

function findImportedAssetByPath(
  importedLanding: ImportedLanding,
  assetPath: string
): ImportedAsset | undefined {
  const normalized = normalizeZipPath(assetPath);
  if (!normalized) {
    return undefined;
  }

  return findImportedAsset(importedLanding, [normalized]);
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

export {
  buildImportedLandingAssetProxyUrl,
  buildImportedLandingEditorProject,
  buildImportedLandingEditorStyles,
  extractImportedLanding,
  findImportedAssetByPath,
  getImportedLandingCssText,
  getImportedLandingHtmlSections,
  resolveImportedAssetUrl,
  rewriteImportedAssetUrls,
  rewriteImportedCssUrls
};
