import JSZip from "jszip";

/* ───────── Helpers ───────── */

function minifyHtml(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:<>/\\,=])\s*/g, "$1")
    .replace(/>\s+</g, "><")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function minifyCss(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>~+!])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

function minifyJs(input: string): string {
  return input
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,=+\-*/%!<>?:&|^~])\s*/g, "$1")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "export"
  );
}

/* ───────── Image processing ───────── */

type ImageAsset = {
  originalUrl: string;
  fileName: string;
};

function parseImageUrls(html: string, css: string): ImageAsset[] {
  const seen = new Set<string>();
  const result: ImageAsset[] = [];
  let counter = 0;

  const addUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith("data:") || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    counter++;
    result.push({ originalUrl: trimmed, fileName: `image-${counter}.webp` });
  };

  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    addUrl(match[1]);
  }

  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    match[1].split(",").forEach((part) => {
      const url = part.trim().split(/\s+/)[0];
      if (url) addUrl(url);
    });
  }

  const cssUrlRegex = /url\(["']?([^"')]+)["']?\)/gi;
  while ((match = cssUrlRegex.exec(css)) !== null) {
    const url = match[1];
    if (!url.startsWith("data:") && !url.startsWith("#")) {
      addUrl(url);
    }
  }

  const cssUrlRegexHtml = /url\(["']?([^"')]+)["']?\)/gi;
  while ((match = cssUrlRegexHtml.exec(html)) !== null) {
    const url = match[1];
    if (!url.startsWith("data:") && !url.startsWith("#")) {
      addUrl(url);
    }
  }

  return result;
}

async function downloadAndConvertToWebP(
  url: string,
  fileName: string,
  zip: JSZip,
  abortSignal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: abortSignal });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || blob.type;

    if (
      contentType.startsWith("image/svg") ||
      contentType.startsWith("image/gif") ||
      contentType.startsWith("image/webp")
    ) {
      zip.file(
        `assets/images/${fileName.replace(/\.webp$/, `.${blob.type.split("/")[1] || "bin"}`)}`,
        blob
      );
      return null;
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.8)
    );
    canvas.width = 0;
    canvas.height = 0;

    if (webpBlob) {
      zip.file(`assets/images/${fileName}`, webpBlob);
      return `assets/images/${fileName}`;
    }

    zip.file(`assets/images/${fileName.replace(/\.webp$/, ".png")}`, blob);
    return null;
  } catch {
    return null;
  }
}

/* ───────── Main export ───────── */

export type ExportOptions = {
  html: string;
  css: string;
  js?: string;
  name?: string;
  onProgress?: (message: string, percent: number) => void;
  abortSignal?: AbortSignal;
};

export async function exportLandingZip(options: ExportOptions): Promise<void> {
  const { html, css, js, name, onProgress, abortSignal } = options;
  const projectName = slugify(name || "landing");
  const zip = new JSZip();

  onProgress?.("Preparing files...", 5);

  const minifiedHtml = minifyHtml(html);
  const minifiedCss = minifyCss(css);
  const minifiedJs = js ? minifyJs(js) : "";

  onProgress?.("Scanning images...", 15);

  const images = parseImageUrls(html, css);

  let htmlContent = minifiedHtml;
  let cssContent = minifiedCss;

  if (images.length > 0) {
    onProgress?.(`Processing ${images.length} images...`, 20);

    let completed = 0;
    const imagePromises = images.map(async (img) => {
      if (abortSignal?.aborted) {
        return;
      }

      const webpPath = await downloadAndConvertToWebP(
        img.originalUrl,
        img.fileName,
        zip,
        abortSignal
      );
      completed++;

      if (webpPath) {
        const urlSafe = img.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const imgTagRegex = new RegExp(`(<img[^>]+src=["'])${urlSafe}(["'][^>]*>)`, "gi");
        htmlContent = htmlContent.replace(imgTagRegex, `$1${webpPath}$2`);

        const cssRegex = new RegExp(`url\\(["']?${urlSafe}["']?\\)`, "gi");
        htmlContent = htmlContent.replace(cssRegex, `url("${webpPath}")`);
        cssContent = cssContent.replace(cssRegex, `url("${webpPath}")`);
      }

      onProgress?.(
        `Processing images... (${completed}/${images.length})`,
        20 + Math.round((completed / images.length) * 50)
      );
    });

    await Promise.all(imagePromises);
  }

  if (abortSignal?.aborted) {
    return;
  }

  onProgress?.("Building archive...", 75);

  const cssPath = "assets/style/styles.css";
  const jsPath = "assets/js/script.js";

  if (minifiedJs) {
    zip.file(jsPath, minifiedJs);

    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace(
        "</body>",
        `<script src="${jsPath}"></script></body>`
      );
    } else {
      htmlContent += `\n<script src="${jsPath}"></script>`;
    }
  }

  if (cssContent.trim()) {
    zip.file(cssPath, cssContent);

    if (htmlContent.includes("</head>")) {
      htmlContent = htmlContent.replace(
        "</head>",
        `  <link rel="stylesheet" href="${cssPath}">\n</head>`
      );
    }
  }

  zip.file("index.html", htmlContent);
  zip.file("index.php", `<?php include 'index.html'; ?>`);

  onProgress?.("Compressing...", 90);

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => {
      onProgress?.("Compressing...", 90 + Math.round(metadata.percent * 0.1));
    }
  );

  if (abortSignal?.aborted) {
    return;
  }

  onProgress?.("Downloading...", 100);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${projectName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
