import { describe, expect, it } from "vitest";

import {
  buildImportedLandingEditorProject,
  resolveImportedAssetUrl
} from "./imported-landing.utils";
import type { ImportedLanding } from "./zip-import.types";

function createImportedLanding(
  overrides: Partial<ImportedLanding> = {}
): ImportedLanding {
  return {
    source: {
      filename: "landing.zip",
      size: 1,
      contentHash: "hash",
      importedAt: new Date().toISOString(),
      importerId: "user-1",
      s3Key: "landings/l1/versions/1/source.zip"
    },
    entrypoint: "white--en-diabet-massage/index.html",
    assets: [
      {
        path: "white--en-diabet-massage/js/plugins.min.js",
        mimeType: "application/javascript",
        size: 10,
        s3Key: "landings/l1/versions/1/assets/white--en-diabet-massage/js/plugins.min.js",
        url: "http://localhost:9000/landing-assets/landings/l1/versions/1/assets/white--en-diabet-massage/js/plugins.min.js"
      },
      {
        path: "white--en-diabet-massage/images/hero/1.webp",
        mimeType: "image/webp",
        size: 20,
        s3Key:
          "landings/l1/versions/1/assets/white--en-diabet-massage/images/hero/1.webp",
        url: "http://localhost:9000/landing-assets/landings/l1/versions/1/assets/white--en-diabet-massage/images/hero/1.webp"
      }
    ],
    document: {
      rawHtml: "",
      head: "",
      body: '<body><script src="js/plugins.min.js"></script><img src="images/hero/1.webp" /></body>',
      inlineCss: [],
      linkedCss: [],
      scripts: [{ src: "js/plugins.min.js" }]
    },
    sections: [],
    variables: [],
    renderMode: "universal-sections",
    ...overrides
  };
}

describe("imported-landing.utils", () => {
  const assetToken = "test-editor-asset-token";

  it("resolves nested zip asset paths from relative references", () => {
    const importedLanding = createImportedLanding();

    expect(
      resolveImportedAssetUrl(
        importedLanding,
        importedLanding.entrypoint,
        "js/plugins.min.js",
        { landingId: "landing-1", assetToken }
      )
    ).toBe(
      `/api/landings/landing-1/assets/white--en-diabet-massage/js/plugins.min.js?token=${encodeURIComponent(assetToken)}`
    );

    expect(
      resolveImportedAssetUrl(
        importedLanding,
        importedLanding.entrypoint,
        "images/hero/1.webp",
        { landingId: "landing-1", assetToken }
      )
    ).toBe(
      `/api/landings/landing-1/assets/white--en-diabet-massage/images/hero/1.webp?token=${encodeURIComponent(assetToken)}`
    );
  });

  it("rewrites stored storage URLs to same-origin editor proxy URLs", () => {
    const importedLanding = createImportedLanding();
    const project = buildImportedLandingEditorProject(
      "landing-1",
      importedLanding,
      assetToken
    );

    expect(project.pages[0]?.component).toContain(
      `/api/landings/landing-1/assets/white--en-diabet-massage/js/plugins.min.js?token=${encodeURIComponent(assetToken)}`
    );
    expect(project.pages[0]?.component).toContain(
      `/api/landings/landing-1/assets/white--en-diabet-massage/images/hero/1.webp?token=${encodeURIComponent(assetToken)}`
    );
    expect(project.pages[0]?.component).not.toContain("localhost:9000");
  });
});
