import { ConflictException } from "@nestjs/common";
import { LandingStatus, Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createEditorAssetToken } from "./editor-asset-token";
import { LandingsService } from "./landings.service";

const editorUser = {
  id: "user-1",
  email: "user@example.com",
  role: Role.EDITOR
} as const;

function createService(
  prisma: Record<string, unknown>,
  storage: Record<string, unknown> = {},
  landingContext: Record<string, unknown> = {}
) {
  return new LandingsService(
    prisma as never,
    {} as never,
    {} as never,
    {
      getObjectBuffer: vi.fn().mockResolvedValue(Buffer.from(".hero{color:red;}")),
      ...storage
    } as never,
    {
      resolve: vi.fn().mockResolvedValue({
        currency: "USD",
        discount: "12",
        geoId: "geo_us",
        i18n: {},
        lang: "en",
        landingId: "landing_1",
        placeholders: {},
        pixels: { pixelId: "pixel-1" },
        postbacks: { url: "https://postback.test" },
        price: "39",
        productId: "product_1",
        productImage: "https://cdn.example.com/product.png",
        productName: "Default product",
        resolvedAt: new Date().toISOString(),
        seoMeta: null,
        settings: {},
        slug: "landing-us",
        templateId: null,
        versionId: "v1",
        oldPrice: "55"
      }),
      ...landingContext
    } as never
  );
}

describe("LandingsService", () => {
  it("reports active name availability case-insensitively", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "landing_1" });
    const service = createService({
      landing: {
        findFirst
      }
    });

    await expect(
      service.nameAvailability({ name: " Spring Campaign " })
    ).resolves.toEqual({
      available: false,
      name: "Spring Campaign"
    });
    expect(findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        deletedAt: null,
        name: { equals: "Spring Campaign", mode: "insensitive" }
      }
    });
  });

  it("reports deleted duplicate names as available", async () => {
    const service = createService({
      landing: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    });

    await expect(service.nameAvailability({ name: "Spring Campaign" })).resolves.toEqual({
      available: true,
      name: "Spring Campaign"
    });
  });

  it("suggests public ids from GEO, category, variant, and existing suffixes", async () => {
    const service = createService({
      category: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ slug: "diabetes-care" })
      },
      geo: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ code: "US" })
      },
      landing: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { publicId: "us-diabetes-care-form-1" },
            { publicId: "us-diabetes-care-form-4" },
            { publicId: "us-diabetes-care-form-copy" }
          ])
      },
      variant: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ slug: "form" })
      }
    });

    await expect(
      service.publicIdSuggestion({
        categoryId: "category_1",
        geoId: "geo_us",
        variantId: "variant_1"
      })
    ).resolves.toEqual({
      base: "us-diabetes-care-form",
      nextNumber: 5,
      publicId: "us-diabetes-care-form-5"
    });
  });

  it("rejects create when active name is already used", async () => {
    const service = createService({
      landing: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: "landing_1" })
      }
    });

    await expect(
      service.create(
        {
          categoryId: "category_1",
          geoId: "geo_us",
          name: "Spring Campaign",
          slug: "spring-campaign",
          variantId: "variant_1"
        },
        { email: "owner@example.test", id: "user_1", role: Role.OWNER }
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates draft landings with required relations", async () => {
    const created = { id: "landing_1", status: LandingStatus.DRAFT };
    const create = vi.fn().mockResolvedValue(created);
    const service = createService({
      landing: {
        create,
        findFirst: vi.fn().mockResolvedValue(null)
      }
    });

    await expect(
      service.create(
        {
          categoryId: "category_1",
          geoId: "geo_us",
          name: " Spring Campaign ",
          publicId: "us-diabetes-form-1",
          slug: "us-diabetes-form-1",
          status: LandingStatus.DRAFT,
          templateId: "template_1",
          variantId: "variant_1"
        },
        { email: "owner@example.test", id: "user_1", role: Role.OWNER }
      )
    ).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "category_1",
          geoId: "geo_us",
          name: "Spring Campaign",
          ownerId: "user_1",
          publicId: "us-diabetes-form-1",
          slug: "us-diabetes-form-1",
          status: LandingStatus.DRAFT,
          templateId: "template_1",
          variantId: "variant_1"
        })
      })
    );
  });

  it("filters landings by multiple GEO ids or codes", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = createService({
      $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      landing: {
        count,
        findMany
      }
    });

    await service.list({
      geo: "US, geo_de ",
      limit: 20,
      page: 1
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          geo: {
            OR: [
              { id: { in: ["US", "geo_de"] } },
              { code: { in: ["US", "geo_de"], mode: "insensitive" } }
            ]
          }
        })
      })
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          geo: expect.any(Object)
        })
      })
    );
  });

  it("duplicates a landing into the requested GEO", async () => {
    const source = {
      categoryId: "category_1",
      currentVersion: null,
      geoId: "geo_us",
      id: "landing_1",
      name: "Spring Campaign",
      notes: null,
      pixels: null,
      postbacks: null,
      publicId: "spring-us",
      seoMeta: null,
      settings: null,
      slug: "spring-campaign",
      tags: [],
      templateId: "template_1",
      variantId: "variant_1",
      versions: []
    };
    const copied = { id: "landing_2" };
    const tx = {
      landing: {
        create: vi.fn().mockResolvedValue(copied),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce(copied),
        update: vi.fn()
      },
      version: {
        create: vi.fn()
      }
    };
    const service = createService({
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx)
      )
    });

    await service.duplicate(
      "landing_1",
      { geoId: "geo_de" },
      { email: "owner@example.test", id: "user_1", role: Role.OWNER }
    );

    expect(tx.landing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          geoId: "geo_de",
          status: LandingStatus.DRAFT
        })
      })
    );
  });

  it("builds a Studio-ready editor project for imported ZIP landings", async () => {
    const service = createService({
      landing: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          template: null,
          versions: [],
          currentVersion: {
            html: '<!doctype html><html><head></head><body><section class="hero">Hero</section></body></html>',
            css: ".hero{color:red;}",
            customCss: ".cta{color:blue;}",
            placeholders: {},
            grapesJson: {
              importedLanding: {
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
                    path: "styles/main.css",
                    mimeType: "text/css",
                    size: 10,
                    s3Key: "landings/l1/versions/1/assets/styles/main.css",
                    url: "https://cdn.example.com/styles/main.css"
                  },
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
                    '<!doctype html><html><head><link rel="stylesheet" href="./styles/main.css"></head><body><section class="hero"><img src="./images/hero.png" /><script src="./js/app.js"></script></section></body></html>',
                  head: '<head><link rel="stylesheet" href="./styles/main.css"></head>',
                  body: '<body><section class="hero"><img src="./images/hero.png" /><script src="./js/app.js"></script></section></body>',
                  inlineCss: [".hero{margin:0;background:url('./images/hero.png');}"],
                  linkedCss: ["./styles/main.css"],
                  scripts: [{ src: "./js/app.js" }]
                },
                sections: [],
                variables: [
                  {
                    key: "PRODUCT_NAME",
                    source: "php",
                    syntax: "$PRODUCT_NAME"
                  },
                  {
                    key: "LS_PRODUCT_NAME",
                    source: "placeholder",
                    syntax: "{{LS_PRODUCT_NAME}}"
                  }
                ],
                renderMode: "universal-sections"
              }
            }
          }
        })
      }
    });

    const result = await service.editor("landing_1", editorUser);
    const project = result.components as {
      assets: unknown[];
      pages: Array<{ component: string; styles: string }>;
    };
    const assetToken = createEditorAssetToken({
      landingId: "landing_1",
      userId: editorUser.id
    });
    const tokenQuery = `?token=${encodeURIComponent(assetToken)}`;

    expect(Array.isArray(project.assets)).toBe(true);
    expect(project.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: `/api/landings/landing_1/assets/images/hero.png${tokenQuery}`,
          type: "image"
        })
      ])
    );
    expect(project.pages[0]?.component).toContain('<section class="hero">');
    expect(project.pages[0]?.component).not.toContain("<html");
    expect(project.pages[0]?.component).toContain(
      `/api/landings/landing_1/assets/images/hero.png${tokenQuery}`
    );
    expect(project.pages[0]?.component).toContain(
      `/api/landings/landing_1/assets/js/app.js${tokenQuery}`
    );
    expect(project.pages[0]?.styles).not.toContain("@import");
    expect(project.pages[0]?.styles).toContain(".hero{color:red;}");
    expect(project.pages[0]?.styles).toContain(
      `.hero{margin:0;background:url("/api/landings/landing_1/assets/images/hero.png${tokenQuery}");}`
    );
    expect(project.pages[0]?.styles).toContain(
      `background:url("/api/landings/landing_1/assets/images/hero.png${tokenQuery}")`
    );
    expect(result.importedVariables).toEqual([
      {
        detectedKey: "PRODUCT_NAME",
        detectedSyntax: "$PRODUCT_NAME",
        draftValue: "Default product",
        effectiveValue: "Default product",
        isEditable: true,
        isMapped: true,
        isOverridden: false,
        placeholderKey: "PRODUCT_NAME",
        runtimeKey: "LS_PRODUCT_NAME",
        source: "php"
      },
      {
        detectedKey: "LS_PRODUCT_NAME",
        detectedSyntax: "{{LS_PRODUCT_NAME}}",
        draftValue: "Default product",
        effectiveValue: "Default product",
        isEditable: true,
        isMapped: true,
        isOverridden: false,
        placeholderKey: "PRODUCT_NAME",
        runtimeKey: "LS_PRODUCT_NAME",
        source: "placeholder"
      }
    ]);
  });

  it("marks unmapped PHP variables as read-only and keeps mapped variables editable", async () => {
    const service = createService(
      {
        landing: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            template: null,
            versions: [],
            currentVersion: {
              html: "<!doctype html><html><body><section>Hero</section></body></html>",
              css: ".hero{color:red;}",
              customCss: "",
              placeholders: {
                CTA: "Draft CTA"
              },
              grapesJson: {
                importedLanding: {
                  source: {
                    filename: "landing.zip",
                    size: 123,
                    contentHash: "hash",
                    importedAt: new Date().toISOString(),
                    importerId: "user-1",
                    s3Key: "landings/l1/versions/1/source.zip"
                  },
                  entrypoint: "index.php",
                  assets: [],
                  document: {
                    rawHtml:
                      "<!doctype html><html><body><?php echo $CTA; ?><?php echo $UNKNOWN_VAR; ?></body></html>",
                    head: "",
                    body: "<body><?php echo $CTA; ?><?php echo $UNKNOWN_VAR; ?></body>",
                    inlineCss: [],
                    linkedCss: [],
                    scripts: []
                  },
                  sections: [],
                  variables: [
                    {
                      key: "CTA",
                      source: "php",
                      syntax: "$CTA"
                    },
                    {
                      key: "UNKNOWN_VAR",
                      source: "php",
                      syntax: "$UNKNOWN_VAR"
                    }
                  ],
                  renderMode: "universal-sections"
                }
              }
            }
          })
        }
      },
      {},
      {
        resolve: vi.fn().mockResolvedValue({
          currency: "USD",
          discount: null,
          geoId: "geo_us",
          i18n: {},
          lang: "en",
          landingId: "landing_1",
          placeholders: {
            CTA: "Draft CTA"
          },
          pixels: null,
          postbacks: null,
          price: "39",
          productId: "product_1",
          productImage: null,
          productName: "Default product",
          resolvedAt: new Date().toISOString(),
          seoMeta: null,
          settings: {},
          slug: "landing-us",
          templateId: null,
          versionId: "v1",
          oldPrice: "55"
        })
      }
    );

    const result = await service.editor("landing_1", editorUser);

    expect(result.importedVariables).toEqual([
      {
        detectedKey: "CTA",
        detectedSyntax: "$CTA",
        draftValue: "Draft CTA",
        effectiveValue: "Draft CTA",
        isEditable: true,
        isMapped: true,
        isOverridden: true,
        placeholderKey: "CTA",
        runtimeKey: "LS_CTA",
        source: "php"
      },
      {
        detectedKey: "UNKNOWN_VAR",
        detectedSyntax: "$UNKNOWN_VAR",
        draftValue: "",
        effectiveValue: "",
        isEditable: false,
        isMapped: false,
        isOverridden: false,
        placeholderKey: null,
        runtimeKey: null,
        source: "php"
      }
    ]);
  });

  it("uses current draft placeholder overrides when building imported variables", async () => {
    const service = createService(
      {
        landing: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            template: null,
            versions: [],
            currentVersion: {
              html: '<!doctype html><html><head></head><body><section class="hero">Hero</section></body></html>',
              css: ".hero{color:red;}",
              customCss: ".cta{color:blue;}",
              placeholders: {
                PRODUCT_NAME: "Draft Product"
              },
              grapesJson: {
                importedLanding: {
                  source: {
                    filename: "landing.zip",
                    size: 123,
                    contentHash: "hash",
                    importedAt: new Date().toISOString(),
                    importerId: "user-1",
                    s3Key: "landings/l1/versions/1/source.zip"
                  },
                  entrypoint: "index.html",
                  assets: [],
                  document: {
                    rawHtml:
                      "<!doctype html><html><body><?php echo $PRODUCT_NAME; ?></body></html>",
                    head: "",
                    body: "<body><?php echo $PRODUCT_NAME; ?></body>",
                    inlineCss: [],
                    linkedCss: [],
                    scripts: []
                  },
                  sections: [],
                  variables: [
                    {
                      key: "PRODUCT_NAME",
                      source: "php",
                      syntax: "$PRODUCT_NAME"
                    }
                  ],
                  renderMode: "universal-sections"
                }
              }
            }
          })
        }
      },
      {
        getObjectBuffer: vi.fn().mockResolvedValue(Buffer.from(".hero{color:red;}"))
      },
      {
        resolve: vi.fn().mockResolvedValue({
          currency: "USD",
          discount: null,
          geoId: "geo_us",
          i18n: {},
          lang: "en",
          landingId: "landing_1",
          placeholders: {
            PRODUCT_NAME: "Draft Product"
          },
          pixels: null,
          postbacks: null,
          price: "39",
          productId: "product_1",
          productImage: null,
          productName: "Default product",
          resolvedAt: new Date().toISOString(),
          seoMeta: null,
          settings: {},
          slug: "landing-us",
          templateId: null,
          versionId: "v1",
          oldPrice: "55"
        })
      }
    );

    const result = await service.editor("landing_1", editorUser);

    expect(result.importedVariables).toEqual([
      {
        detectedKey: "PRODUCT_NAME",
        detectedSyntax: "$PRODUCT_NAME",
        draftValue: "Draft Product",
        effectiveValue: "Draft Product",
        isEditable: true,
        isMapped: true,
        isOverridden: true,
        placeholderKey: "PRODUCT_NAME",
        runtimeKey: "LS_PRODUCT_NAME",
        source: "php"
      }
    ]);
  });

  it("falls back to the latest imported ZIP snapshot when the current autosave lost importedLanding metadata", async () => {
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
          path: "styles/main.css",
          mimeType: "text/css",
          size: 20,
          s3Key: "landings/l1/versions/1/assets/styles/main.css",
          url: "https://cdn.example.com/styles/main.css"
        }
      ],
      document: {
        rawHtml:
          '<!doctype html><html><head><link rel="stylesheet" href="./styles/main.css"></head><body><section class="hero"><img src="./images/hero.png" /></section></body></html>',
        head: '<head><link rel="stylesheet" href="./styles/main.css"></head>',
        body: '<body><section class="hero"><img src="./images/hero.png" /></section></body>',
        inlineCss: [],
        linkedCss: ["./styles/main.css"],
        scripts: []
      },
      sections: [],
      variables: [],
      renderMode: "universal-sections" as const
    };

    const service = createService({
      landing: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          template: null,
          currentVersion: {
            html: '<body><section class="hero"><img src="./images/hero.png" /></section></body>',
            css: ".hero{color:red;}",
            customCss: "",
            placeholders: {},
            grapesJson: {
              assets: [],
              components: {
                pages: [{ name: "Home" }]
              }
            }
          },
          versions: [
            {
              grapesJson: {
                importedLanding
              }
            }
          ]
        })
      }
    });

    const result = await service.editor("landing_1", editorUser);
    const project = result.components as {
      pages: Array<{ component: string; styles: string }>;
    };
    const assetToken = createEditorAssetToken({
      landingId: "landing_1",
      userId: editorUser.id
    });
    const tokenQuery = `?token=${encodeURIComponent(assetToken)}`;

    expect(project.pages[0]?.component).toContain(
      `/api/landings/landing_1/assets/images/hero.png${tokenQuery}`
    );
    expect(project.pages[0]?.styles).not.toContain("@import");
    expect(project.pages[0]?.styles).toContain(".hero{color:red;}");
  });

  it("extracts imported variables on read for older ZIP snapshots that predate variables metadata", async () => {
    const service = createService({
      landing: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          template: null,
          versions: [],
          currentVersion: {
            html: "<!doctype html><html><body><section>Hero</section></body></html>",
            css: ".hero{color:red;}",
            customCss: "",
            placeholders: {},
            grapesJson: {
              importedLanding: {
                source: {
                  filename: "landing.zip",
                  size: 123,
                  contentHash: "hash",
                  importedAt: new Date().toISOString(),
                  importerId: "user-1",
                  s3Key: "landings/l1/versions/1/source.zip"
                },
                entrypoint: "index.php",
                assets: [],
                document: {
                  rawHtml:
                    "<!doctype html><html><body><?php echo $PRODUCT_NAME; ?><div>{{LS_PRICE}}</div></body></html>",
                  head: "",
                  body: "<body><?php echo $PRODUCT_NAME; ?><div>{{LS_PRICE}}</div></body>",
                  inlineCss: [],
                  linkedCss: [],
                  scripts: []
                },
                sections: [],
                renderMode: "universal-sections"
              }
            }
          }
        })
      }
    });

    const result = await service.editor("landing_1", editorUser);

    expect(result.importedVariables).toEqual([
      {
        detectedKey: "PRODUCT_NAME",
        detectedSyntax: "$PRODUCT_NAME",
        draftValue: "Default product",
        effectiveValue: "Default product",
        isEditable: true,
        isMapped: true,
        isOverridden: false,
        placeholderKey: "PRODUCT_NAME",
        runtimeKey: "LS_PRODUCT_NAME",
        source: "php"
      },
      {
        detectedKey: "LS_PRICE",
        detectedSyntax: "{{LS_PRICE}}",
        draftValue: "39.00",
        effectiveValue: "39.00",
        isEditable: true,
        isMapped: true,
        isOverridden: false,
        placeholderKey: "PRICE",
        runtimeKey: "LS_PRICE",
        source: "placeholder"
      }
    ]);
  });

  it("bulk-updates selected landing statuses", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const service = createService({
      landing: {
        updateMany
      }
    });

    const result = await service.bulkUpdateStatus({
      ids: ["landing_1", "landing_2"],
      status: LandingStatus.PUBLISHED
    });

    expect(result).toEqual({ count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      data: { status: LandingStatus.PUBLISHED },
      where: {
        deletedAt: null,
        id: { in: ["landing_1", "landing_2"] }
      }
    });
  });

  it("bulk soft-deletes selected landings", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const service = createService({
      landing: {
        updateMany
      }
    });

    const result = await service.bulkSoftDelete({
      ids: ["landing_1", "landing_2", "landing_3"]
    });

    expect(result).toEqual({ count: 3 });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: expect.any(Date) },
        where: {
          deletedAt: null,
          id: { in: ["landing_1", "landing_2", "landing_3"] }
        }
      })
    );
  });
});
