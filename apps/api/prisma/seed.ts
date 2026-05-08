import { hash } from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const geos = [
  ["US", "United States", "en", "USD", "🇺🇸", "America/New_York"],
  ["DE", "Germany", "de", "EUR", "🇩🇪", "Europe/Berlin"],
  ["BR", "Brazil", "pt-BR", "BRL", "🇧🇷", "America/Sao_Paulo"],
  ["FR", "France", "fr", "EUR", "🇫🇷", "Europe/Paris"],
  ["ES", "Spain", "es", "EUR", "🇪🇸", "Europe/Madrid"],
  ["IT", "Italy", "it", "EUR", "🇮🇹", "Europe/Rome"],
  ["PL", "Poland", "pl", "PLN", "🇵🇱", "Europe/Warsaw"],
  ["UA", "Ukraine", "uk", "UAH", "🇺🇦", "Europe/Kyiv"],
  ["GB", "United Kingdom", "en-GB", "GBP", "🇬🇧", "Europe/London"],
  ["CA", "Canada", "en", "CAD", "🇨🇦", "America/Toronto"],
  ["MX", "Mexico", "es-MX", "MXN", "🇲🇽", "America/Mexico_City"],
  ["AR", "Argentina", "es-AR", "ARS", "🇦🇷", "America/Argentina/Buenos_Aires"],
  ["CL", "Chile", "es-CL", "CLP", "🇨🇱", "America/Santiago"],
  ["CO", "Colombia", "es-CO", "COP", "🇨🇴", "America/Bogota"],
  ["PE", "Peru", "es-PE", "PEN", "🇵🇪", "America/Lima"],
  ["RO", "Romania", "ro", "RON", "🇷🇴", "Europe/Bucharest"],
  ["CZ", "Czech Republic", "cs", "CZK", "🇨🇿", "Europe/Prague"],
  ["NL", "Netherlands", "nl", "EUR", "🇳🇱", "Europe/Amsterdam"],
  ["SE", "Sweden", "sv", "SEK", "🇸🇪", "Europe/Stockholm"],
  ["TR", "Turkey", "tr", "TRY", "🇹🇷", "Europe/Istanbul"]
] as const;

const categories = [
  ["diabetes", "Diabetes", "#0f766e", "activity"],
  ["enlargement", "Enlargement", "#7c3aed", "maximize"],
  ["potency", "Potency", "#dc2626", "zap"],
  ["prostatitis", "Prostatitis", "#2563eb", "shield-plus"],
  ["parasites", "Parasites", "#65a30d", "bug"]
] as const;

const variants = [
  ["form", "Form", "Lead capture landing with a conversion form", "clipboard-list"],
  ["fortune-wheel", "Fortune Wheel", "Gamified offer wheel flow", "badge-percent"],
  ["quiz", "Quiz", "Question-based qualification funnel", "list-checks"],
  ["article", "Article", "Editorial article advertorial", "newspaper"],
  ["video", "Video", "Video-first advertorial or VSL page", "video"],
  [
    "landing-pro",
    "Landing Pro",
    "Extended product landing with modular sections",
    "layout-template"
  ]
] as const;

const templates = [
  {
    slug: "news",
    name: "News",
    description: "News-style advertorial template.",
    tags: ["advertorial", "news"],
    baseHtml: `
<article data-template="news">
  <header>
    <p>{{geo.name}} Health Bulletin</p>
    <h1>{{headline}}</h1>
    <p>{{lead}}</p>
  </header>
  <main>{{body}}</main>
  <footer>{{cta}}</footer>
</article>`,
    placeholders: [
      { key: "headline", type: "text", label: "Headline", required: true },
      { key: "lead", type: "textarea", label: "Lead paragraph", required: true },
      { key: "body", type: "richtext", label: "Body copy", required: true },
      { key: "cta", type: "text", label: "CTA text", default: "Check availability" }
    ]
  },
  {
    slug: "story",
    name: "Story",
    description: "Personal story template with a narrative flow.",
    tags: ["story", "native"],
    baseHtml: `
<article data-template="story">
  <section>
    <h1>{{storyTitle}}</h1>
    <p>{{authorName}} · {{geo.name}}</p>
  </section>
  <section>{{storyBody}}</section>
  <aside>{{offerBox}}</aside>
</article>`,
    placeholders: [
      { key: "storyTitle", type: "text", label: "Story title", required: true },
      { key: "authorName", type: "text", label: "Author name", required: true },
      { key: "storyBody", type: "richtext", label: "Story body", required: true },
      { key: "offerBox", type: "textarea", label: "Offer box copy" }
    ]
  },
  {
    slug: "shock-content",
    name: "Shock Content",
    description: "High-impact content template for urgent hooks.",
    tags: ["shock", "content"],
    baseHtml: `
<article data-template="shock-content">
  <header>
    <p>{{kicker}}</p>
    <h1>{{shockHeadline}}</h1>
  </header>
  <section>{{proofBlocks}}</section>
  <section>{{cta}}</section>
</article>`,
    placeholders: [
      { key: "kicker", type: "text", label: "Kicker", required: true },
      { key: "shockHeadline", type: "text", label: "Shock headline", required: true },
      { key: "proofBlocks", type: "array", label: "Proof blocks" },
      { key: "cta", type: "text", label: "CTA text", default: "Learn more" }
    ]
  }
] as const;

async function main() {
  const adminPasswordHash = await hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash
    },
    create: {
      email: "admin@example.com",
      name: "Admin",
      role: Role.ADMIN,
      isActive: true,
      emailVerified: new Date(),
      passwordHash: adminPasswordHash
    }
  });

  for (const [index, geo] of geos.entries()) {
    const [code, name, language, currency, flagEmoji, timezone] = geo;

    await prisma.geo.upsert({
      where: { code },
      update: {
        name,
        language,
        currency,
        flagEmoji,
        timezone,
        sortOrder: index,
        isActive: true
      },
      create: { code, name, language, currency, flagEmoji, timezone, sortOrder: index }
    });
  }

  for (const [index, category] of categories.entries()) {
    const [slug, name, color, icon] = category;

    await prisma.category.upsert({
      where: { slug },
      update: { name, color, icon, sortOrder: index, isActive: true },
      create: { slug, name, color, icon, sortOrder: index }
    });
  }

  for (const [index, variant] of variants.entries()) {
    const [slug, name, description, icon] = variant;

    await prisma.variant.upsert({
      where: { slug },
      update: { name, description, icon, sortOrder: index, isActive: true },
      create: { slug, name, description, icon, sortOrder: index }
    });
  }

  const diabetes = await prisma.category.findUniqueOrThrow({
    where: { slug: "diabetes" }
  });
  const seededGeos = await prisma.geo.findMany({ select: { id: true } });

  for (const template of templates) {
    const savedTemplate = await prisma.template.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        baseHtml: template.baseHtml.trim(),
        placeholders: template.placeholders,
        tags: [...template.tags],
        isActive: true,
        isPublic: true,
        categoryId: diabetes.id,
        authorId: admin.id
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        baseHtml: template.baseHtml.trim(),
        placeholders: template.placeholders,
        tags: [...template.tags],
        isActive: true,
        isPublic: true,
        categoryId: diabetes.id,
        authorId: admin.id
      }
    });

    for (const geo of seededGeos) {
      await prisma.templateGeo.upsert({
        where: { templateId_geoId: { templateId: savedTemplate.id, geoId: geo.id } },
        update: {},
        create: { templateId: savedTemplate.id, geoId: geo.id }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
