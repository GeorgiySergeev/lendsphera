import { describe, expect, it, vi } from "vitest";

import { VersionsService } from "./versions.service";

describe("VersionsService.saveDraft", () => {
  it("preserves importedLanding metadata from the latest imported version", async () => {
    const createdVersion = { id: "version-2", versionNum: 2 };
    const importedLanding = {
      source: {
        filename: "landing.zip",
        size: 123,
        contentHash: "hash",
        importedAt: new Date().toISOString(),
        importerId: "user-1",
        s3Key: "landings/l1/versions/1/source.zip"
      },
      entrypoint: "index.html",
      assets: [
        {
          path: "images/hero.png",
          mimeType: "image/png",
          size: 20,
          s3Key: "landings/l1/versions/1/assets/images/hero.png",
          url: "https://cdn.example.com/images/hero.png"
        },
        {
          path: "js/app.js",
          mimeType: "application/javascript",
          size: 10,
          s3Key: "landings/l1/versions/1/assets/js/app.js",
          url: "https://cdn.example.com/js/app.js"
        }
      ],
      document: {
        rawHtml:
          '<html><head><link rel="stylesheet" href="./styles/main.css"></head><body><img src="./images/hero.png" /></body></html>',
        head: "<head></head>",
        body: '<body><img src="./images/hero.png" /></body>',
        inlineCss: [],
        linkedCss: ["./styles/main.css"],
        scripts: []
      },
      sections: [],
      renderMode: "universal-sections" as const
    };

    const tx = {
      landing: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          currentVersion: {
            grapesJson: {
              assets: [],
              components: { pages: [{ name: "Home" }] }
            }
          }
        }),
        update: vi.fn().mockResolvedValue(undefined)
      },
      version: {
        findFirst: vi.fn().mockResolvedValue({ versionNum: 1 }),
        findMany: vi
          .fn()
          .mockResolvedValue([
            { grapesJson: { assets: [], components: {} } },
            { grapesJson: { importedLanding } }
          ]),
        create: vi.fn().mockResolvedValue(createdVersion)
      }
    };

    const prisma = {
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => unknown) =>
        callback(tx)
      )
    };

    const service = new VersionsService(prisma as never);

    const result = await service.saveDraft(
      "landing-1",
      {
        assets: [{ src: "https://cdn.example.com/images/hero.png" }],
        components: {
          pages: [
            {
              name: "Home",
              component: "<section>Hero</section>",
              frames: [
                {
                  component: {
                    content:
                      '<section><img src="./images/hero.png" /><script src="./js/app.js"></script></section>',
                    components: [
                      {
                        tagName: "img",
                        attributes: {
                          src: "./images/hero.png"
                        }
                      },
                      {
                        tagName: "script",
                        attributes: {
                          src: "./js/app.js"
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        css: ".hero{background:url('./images/hero.png');color:red;}",
        customCss: "",
        html: '<section><img src="./images/hero.png" /></section>',
        layout: {},
        message: "Saved from Studio SDK",
        placeholderValues: {}
      },
      { id: "user-1", email: "user@example.com", role: "EDITOR" }
    );

    expect(result).toEqual(createdVersion);
    expect(tx.version.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grapesJson: expect.objectContaining({
            importedLanding,
            components: {
              pages: [
                {
                  name: "Home",
                  component: "<section>Hero</section>",
                  frames: [
                    {
                      component: {
                        content:
                          '<section><img src="https://cdn.example.com/images/hero.png" /><script src="https://cdn.example.com/js/app.js"></script></section>',
                        components: [
                          {
                            tagName: "img",
                            attributes: {
                              src: "https://cdn.example.com/images/hero.png"
                            }
                          },
                          {
                            tagName: "script",
                            attributes: {
                              src: "https://cdn.example.com/js/app.js"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            }
          }),
          html: '<section><img src="https://cdn.example.com/images/hero.png" /></section>',
          css: '.hero{background:url("https://cdn.example.com/images/hero.png");color:red;}'
        })
      })
    );
  });
});
