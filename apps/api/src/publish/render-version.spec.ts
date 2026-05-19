import { describe, expect, it } from "vitest";

import { renderVersionHtml } from "./render-version";

describe("renderVersionHtml", () => {
  it("prefers imported landing HTML from grapesJson", async () => {
    const html = await renderVersionHtml({
      html: "<html><body><div>fallback</div></body></html>",
      customCss: ".hero{color:red;}",
      grapesJson: {
        importedLanding: {
          renderMode: "universal-sections",
          document: {
            rawHtml:
              "<!DOCTYPE html><html><head></head><body><section>zip import</section></body></html>",
            head: "<head></head>",
            body: "<body><section>zip import</section></body>",
            inlineCss: [],
            linkedCss: [],
            scripts: []
          },
          sections: [
            {
              id: "section-0",
              type: "html-section",
              name: "Section 1",
              html: "<section>zip import</section>",
              cssRefs: []
            }
          ]
        }
      }
    });

    expect(html).toContain("zip import");
    expect(html).not.toContain("fallback");
  });

  it("injects style and script tags even when the document has no head or body", async () => {
    const html = await renderVersionHtml({
      html: '<div data-widget="hero"></div>',
      customCss: ".hero{display:block;}",
      customJs: "window.__zipImportReady = true;"
    });

    expect(html).toContain("<style>");
    expect(html).toContain("window.__zipImportReady");
    expect(html).toContain("/widget-loader.js");
    expect(html).toContain("<html");
  });
});
