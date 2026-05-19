import { describe, expect, it, vi } from "vitest";

import { RuntimeLandingsService } from "./runtime-landings.service";

describe("RuntimeLandingsService", () => {
  it("returns imported HTML sections when there is no widget snapshot", async () => {
    const prisma = {
      landing: {
        findFirst: vi.fn().mockResolvedValue({
          id: "landing-1",
          slug: "zip-landing",
          name: "ZIP Landing",
          notes: null,
          status: "PUBLISHED",
          geo: { code: "US" },
          versions: [
            {
              id: "version-1",
              status: "PUBLISHED",
              versionNum: 1,
              html: "<html><body><section>fallback</section></body></html>",
              css: ".fallback{color:red;}",
              customCss: ".fallback{color:red;}",
              grapesJson: {
                importedLanding: {
                  source: {
                    filename: "landing.zip",
                    size: 123,
                    contentHash: "hash",
                    importedAt: new Date().toISOString(),
                    importerId: "user-1",
                    s3Key: "landings/landing-1/versions/1/source.zip"
                  },
                  entrypoint: "index.html",
                  assets: [],
                  document: {
                    rawHtml:
                      '<!DOCTYPE html><html><head><style>.zip{color:blue;}</style></head><body><section class="zip">Imported section</section></body></html>',
                    head: "<head><style>.zip{color:blue;}</style></head>",
                    body: '<body><section class="zip">Imported section</section></body>',
                    inlineCss: [".zip{color:blue;}"],
                    linkedCss: [],
                    scripts: []
                  },
                  sections: [
                    {
                      id: "section-0",
                      type: "html-section",
                      name: "Section 1",
                      html: '<section class="zip">Imported section</section>',
                      cssRefs: []
                    }
                  ],
                  renderMode: "universal-sections"
                }
              }
            }
          ],
          currentVersion: null
        })
      }
    } as any;

    const landingContext = {
      resolve: vi.fn().mockResolvedValue({ lang: "en", seoMeta: null, pixels: null })
    } as any;

    const service = new RuntimeLandingsService(prisma, landingContext);
    const result = await service.getByGeoAndSlug("us", "zip-landing", null);

    expect(result?.snapshot.specs).toEqual([]);
    expect(result?.snapshot.htmlSections).toEqual([
      {
        id: "section-0",
        html: '<section class="zip">Imported section</section>'
      }
    ]);
    expect(result?.snapshot.cssText).toContain(".zip{color:blue;}");
  });
});
