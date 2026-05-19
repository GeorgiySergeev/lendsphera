export interface ImportedAsset {
  path: string;
  mimeType: string;
  size: number;
  s3Key?: string;
  url?: string;
}

export interface ImportedSection {
  id: string;
  type: "html-section" | "script-section" | "style-section";
  name: string;
  html?: string;
  css?: string;
  js?: string;
  cssRefs: string[];
  variables?: Record<string, string>;
}

export interface ImportedCodeVariable {
  key: string;
  source: "php" | "placeholder";
  syntax: string;
}

export interface ImportedDocument {
  rawHtml: string;
  head: string;
  body: string;
  inlineCss: string[];
  linkedCss: string[];
  scripts: { src?: string; inline?: string; type?: string }[];
}

export interface ImportedLanding {
  source: {
    filename: string;
    size: number;
    contentHash: string;
    importedAt: string;
    importerId: string;
    s3Key: string;
  };
  entrypoint: string;
  assets: ImportedAsset[];
  document: ImportedDocument;
  sections: ImportedSection[];
  variables: ImportedCodeVariable[];
  renderMode: "universal-sections";
}

export interface ZipValidationResult {
  valid: boolean;
  error?: string;
  entries?: number;
  uncompressedSize?: number;
}

export interface ParsedZip {
  indexHtml: { path: string; content: string };
  assets: { path: string; content: Buffer; mimeType: string }[];
  cssFiles: { path: string; content: string }[];
  allPaths: string[];
}
