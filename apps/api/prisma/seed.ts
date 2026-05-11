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

const componentCategories = [
  { name: "Heroes", slug: "heroes", icon: "🦸", sortOrder: 1 },
  { name: "Offer Blocks", slug: "offer", icon: "🎯", sortOrder: 2 },
  { name: "CTAs", slug: "ctas", icon: "⚡", sortOrder: 3 },
  { name: "Forms", slug: "forms", icon: "📋", sortOrder: 4 },
  { name: "Trust Signals", slug: "trust", icon: "🛡", sortOrder: 5 },
  { name: "Stats", slug: "stats", icon: "📊", sortOrder: 6 },
  { name: "Testimonials", slug: "testimonials", icon: "💬", sortOrder: 7 },
  { name: "Banners", slug: "banners", icon: "📢", sortOrder: 8 },
  { name: "Navigation", slug: "navigation", icon: "🧭", sortOrder: 9 }
] as const;

const componentSeeds = [
  {
    category: "heroes",
    name: "Bold Headline Hero",
    slug: "bold-headline-hero",
    description: "Dark direct-response hero with a strong hook and CTA.",
    html: `
<section class="relative bg-gray-950 text-white py-24 px-6 overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-rose-900/30 to-transparent"></div>
  <div class="relative max-w-4xl mx-auto text-center">
    <span class="inline-block bg-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">Limited Offer</span>
    <h1 class="text-5xl md:text-7xl font-extrabold leading-tight mb-6">Doctors Are <span class="text-rose-400">SHOCKED</span><br>By This Discovery</h1>
    <p class="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">The secret they don't want you to know about natural healing. Over 50,000 people already transformed their health.</p>
    <a href="#offer" class="inline-block bg-rose-500 hover:bg-rose-400 text-white font-bold text-xl px-12 py-5 rounded-full shadow-lg shadow-rose-500/30 transition-all hover:scale-105">Discover The Secret →</a>
    <p class="mt-4 text-gray-500 text-sm">✓ 100% Natural &nbsp; ✓ No Side Effects &nbsp; ✓ Money-back Guarantee</p>
  </div>
</section>`,
    tags: ["hero", "dark", "affiliate", "headline", "cta"],
    previewDark: true,
    previewHeight: 520,
    isPinned: true,
    variants: [
      {
        name: "Light",
        html: `<section class="bg-white text-gray-950 py-24 px-6"><div class="max-w-4xl mx-auto text-center"><p class="text-rose-600 font-bold uppercase tracking-widest text-xs mb-5">Limited Offer</p><h1 class="text-5xl md:text-7xl font-extrabold leading-tight mb-6">A Natural Breakthrough Everyone Is Talking About</h1><p class="text-xl text-gray-600 mb-10">Simple daily support with thousands of verified customers.</p><a href="#offer" class="inline-block bg-gray-950 text-white font-bold text-xl px-12 py-5 rounded-full">Check Availability →</a></div></section>`,
        isDefault: false
      }
    ]
  },
  {
    category: "heroes",
    name: "Split Product Hero",
    slug: "split-product-hero",
    description: "Two-column hero for product advertorial landers.",
    html: `<section class="bg-emerald-50 py-20 px-6"><div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center"><div><p class="text-emerald-700 font-bold uppercase tracking-widest text-xs mb-4">New customer special</p><h1 class="text-5xl font-black text-gray-950 mb-6">Feel lighter, focused, and ready in just 14 days.</h1><p class="text-lg text-gray-700 mb-8">A clean daily formula built for busy adults who want visible momentum without complicated routines.</p><a class="inline-flex bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-emerald-600/20" href="#order">Start Today →</a></div><div class="bg-white rounded-2xl p-8 shadow-xl"><div class="aspect-square rounded-2xl bg-gradient-to-br from-emerald-200 to-white flex items-center justify-center text-7xl font-black text-emerald-700">PRO</div></div></div></section>`,
    tags: ["hero", "product", "split", "affiliate"],
    previewBg: "#ecfdf5",
    previewHeight: 560,
    variants: [{ name: "Centered", html: `<section class="bg-emerald-700 text-white py-24 px-6 text-center"><div class="max-w-3xl mx-auto"><h1 class="text-5xl font-black mb-6">Your simple 14-day reset starts here.</h1><p class="text-xl text-emerald-50 mb-8">Clean ingredients, clear routine, fast checkout.</p><a href="#order" class="bg-white text-emerald-800 font-bold px-8 py-4 rounded-xl inline-block">Claim Discount</a></div></section>`, isDefault: false }]
  },
  {
    category: "offer",
    name: "Price Card with Discount",
    slug: "price-card-discount",
    description: "High-contrast offer card with discount and guarantee points.",
    html: `<div class="max-w-sm mx-auto my-8"><div class="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"><div class="absolute top-4 right-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">-67% OFF</div><div class="bg-gradient-to-b from-gray-50 to-white p-8 text-center"><p class="text-gray-500 text-sm mb-1">Regular price</p><p class="text-2xl text-gray-400 line-through mb-2">€147.00</p><p class="text-6xl font-black text-gray-900">€49</p><p class="text-gray-500 text-sm mt-1">one-time payment</p></div><div class="p-6 space-y-3"><div class="flex items-center gap-3 text-sm text-gray-700"><span class="text-emerald-500 font-bold text-lg">✓</span>Free shipping worldwide</div><div class="flex items-center gap-3 text-sm text-gray-700"><span class="text-emerald-500 font-bold text-lg">✓</span>60-day money back guarantee</div><div class="flex items-center gap-3 text-sm text-gray-700"><span class="text-emerald-500 font-bold text-lg">✓</span>Secure checkout</div></div><div class="px-6 pb-6"><button class="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-lg shadow-rose-500/25">Order Now →</button><p class="text-center text-xs text-gray-400 mt-3">🔒 256-bit SSL Secured</p></div></div></div>`,
    tags: ["price", "offer", "discount", "card", "affiliate"],
    previewHeight: 560,
    variants: [{ name: "Dark", html: `<div class="max-w-sm mx-auto my-8 bg-gray-950 text-white rounded-2xl p-6 shadow-2xl"><p class="text-amber-300 font-bold text-sm">TODAY ONLY</p><p class="text-5xl font-black mt-4">€49</p><p class="text-gray-400 line-through">€147 regular price</p><button class="mt-6 w-full bg-amber-400 text-gray-950 font-black py-4 rounded-xl">Lock My Discount</button></div>`, isDefault: false }]
  },
  {
    category: "offer",
    name: "Three Bottle Bundle",
    slug: "three-bottle-bundle",
    description: "Bundle selector styled for supplement funnels.",
    html: `<div class="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-4"><div class="border rounded-2xl p-6 text-center bg-white"><h3 class="font-black text-xl">Starter</h3><p class="text-4xl font-black my-4">1x</p><p class="text-gray-500 mb-6">30 day supply</p><button class="border border-gray-900 px-6 py-3 rounded-xl font-bold">Select</button></div><div class="border-4 border-emerald-500 rounded-2xl p-6 text-center bg-white shadow-xl relative"><span class="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black">BEST VALUE</span><h3 class="font-black text-xl">Popular</h3><p class="text-4xl font-black my-4">3x</p><p class="text-gray-500 mb-6">90 day supply + free shipping</p><button class="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">Select Bundle</button></div><div class="border rounded-2xl p-6 text-center bg-white"><h3 class="font-black text-xl">Family</h3><p class="text-4xl font-black my-4">6x</p><p class="text-gray-500 mb-6">180 day supply</p><button class="border border-gray-900 px-6 py-3 rounded-xl font-bold">Select</button></div></div>`,
    tags: ["offer", "bundle", "pricing", "supplement"],
    previewHeight: 420,
    variants: [{ name: "Compact", html: `<div class="max-w-xl mx-auto bg-white border rounded-2xl p-5 flex items-center justify-between gap-4"><div><p class="font-black text-xl">3 Bottle Bundle</p><p class="text-gray-500">Save 62% + free shipping</p></div><button class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">Choose</button></div>`, isDefault: false }]
  },
  {
    category: "ctas",
    name: "Sticky Bottom Bar",
    slug: "sticky-bottom-bar",
    description: "Mobile-friendly fixed CTA strip.",
    html: `<div class="fixed bottom-0 inset-x-0 z-50 bg-gray-950 text-white border-t border-white/10 px-4 py-3"><div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3"><p class="font-bold text-center sm:text-left">Special discount ends soon: save 67% today</p><a href="#order" class="bg-rose-500 hover:bg-rose-400 px-6 py-3 rounded-full font-black shadow-lg shadow-rose-500/30">Claim Offer →</a></div></div>`,
    tags: ["cta", "sticky", "bottom", "mobile"],
    previewDark: true,
    previewHeight: 180,
    variants: [{ name: "Light", html: `<div class="fixed bottom-0 inset-x-0 z-50 bg-white border-t px-4 py-3 shadow-2xl"><div class="max-w-5xl mx-auto flex items-center justify-between gap-3"><p class="font-bold text-gray-950">Free shipping on today's order</p><a href="#order" class="bg-gray-950 text-white px-6 py-3 rounded-full font-black">Order Now</a></div></div>`, isDefault: false }]
  },
  {
    category: "ctas",
    name: "Countdown CTA",
    slug: "countdown-cta",
    description: "Urgency block with static countdown display.",
    html: `<section class="bg-amber-50 border-y border-amber-200 py-10 px-6 text-center"><p class="text-amber-700 font-black uppercase tracking-widest text-xs">Offer expires in</p><div class="my-5 flex justify-center gap-3"><span class="bg-gray-950 text-white rounded-xl p-4 font-black text-3xl">02</span><span class="bg-gray-950 text-white rounded-xl p-4 font-black text-3xl">14</span><span class="bg-gray-950 text-white rounded-xl p-4 font-black text-3xl">39</span></div><a href="#order" class="inline-block bg-amber-500 text-gray-950 font-black px-10 py-4 rounded-xl">Reserve My Bottle →</a></section>`,
    tags: ["cta", "countdown", "urgency", "button"],
    previewHeight: 320,
    variants: [{ name: "Exit Intent Bar", html: `<div class="bg-rose-600 text-white px-6 py-4 text-center font-bold">Wait! Your private 50% discount is still available. <a href="#order" class="underline font-black">Use it now</a></div>`, isDefault: false }]
  },
  {
    category: "forms",
    name: "Email Phone Capture",
    slug: "email-phone-capture",
    description: "Lead capture form for email and phone funnels.",
    html: `<form class="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-xl space-y-4"><div><h3 class="text-2xl font-black text-gray-950">Check Your Discount</h3><p class="text-gray-500">Enter details to unlock today's private offer.</p></div><input class="w-full border rounded-xl px-4 py-3" type="email" placeholder="Email address"><input class="w-full border rounded-xl px-4 py-3" type="tel" placeholder="Phone number"><button class="w-full bg-emerald-600 text-white font-black py-4 rounded-xl">Unlock My Offer</button><p class="text-xs text-gray-400 text-center">No spam. Unsubscribe anytime.</p></form>`,
    tags: ["form", "lead", "email", "phone"],
    previewHeight: 430,
    variants: [{ name: "Dark", html: `<form class="max-w-md mx-auto bg-gray-950 text-white rounded-2xl p-6 shadow-xl space-y-4"><h3 class="text-2xl font-black">Get private access</h3><input class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3" placeholder="Email address"><button class="w-full bg-emerald-400 text-gray-950 font-black py-4 rounded-xl">Continue</button></form>`, isDefault: false }]
  },
  {
    category: "forms",
    name: "Quiz Start Card",
    slug: "quiz-start-card",
    description: "Quiz-start block with simple qualification promise.",
    html: `<div class="max-w-lg mx-auto bg-indigo-50 rounded-2xl p-8 text-center border border-indigo-100"><p class="text-indigo-700 font-bold text-sm uppercase tracking-widest mb-3">Personalized recommendation</p><h3 class="text-3xl font-black text-gray-950 mb-4">Find your best formula in 60 seconds</h3><p class="text-gray-600 mb-8">Answer 3 short questions and see which bundle fits your goals.</p><button class="bg-indigo-600 text-white font-black px-10 py-4 rounded-xl shadow-lg shadow-indigo-600/20">Take The Quiz →</button></div>`,
    tags: ["form", "quiz", "start", "affiliate"],
    previewHeight: 380,
    variants: [{ name: "Inline", html: `<div class="bg-indigo-600 text-white p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"><p class="font-bold">Not sure which option is right?</p><button class="bg-white text-indigo-700 font-black px-6 py-3 rounded-xl">Take The Quiz</button></div>`, isDefault: false }]
  },
  {
    category: "trust",
    name: "Star Rating Trust Row",
    slug: "star-rating-trust-row",
    description: "Rating, purchases, and guarantee trust strip.",
    html: `<div class="bg-white border-y border-gray-200 py-6 px-6"><div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center"><div><p class="text-amber-400 text-2xl">★★★★★</p><p class="font-bold text-gray-950">4.9/5 verified rating</p></div><div><p class="text-3xl font-black text-gray-950">128,430+</p><p class="text-gray-500">customers purchased</p></div><div><p class="text-3xl">🛡</p><p class="font-bold text-gray-950">60-day guarantee</p></div></div></div>`,
    tags: ["trust", "stars", "rating", "purchases"],
    previewHeight: 220,
    variants: [{ name: "Dark", html: `<div class="bg-gray-950 text-white py-6 px-6 text-center"><p class="text-amber-300 text-2xl">★★★★★</p><p class="font-bold">Trusted by 128,430+ verified customers</p></div>`, isDefault: false }]
  },
  {
    category: "trust",
    name: "As Seen On Logo Bar",
    slug: "as-seen-on-logo-bar",
    description: "Publisher-style logo bar for advertorial credibility.",
    html: `<section class="bg-gray-50 py-8 px-6"><p class="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">As Seen On</p><div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center"><div class="bg-white border rounded-xl p-4 font-black text-gray-400">HEALTHLINE</div><div class="bg-white border rounded-xl p-4 font-black text-gray-400">DAILY NEWS</div><div class="bg-white border rounded-xl p-4 font-black text-gray-400">WELLNESS</div><div class="bg-white border rounded-xl p-4 font-black text-gray-400">NUTRA</div></div></section>`,
    tags: ["trust", "logos", "as-seen-on", "media"],
    previewHeight: 260,
    variants: [{ name: "Minimal", html: `<div class="py-5 text-center text-gray-400 font-black tracking-widest">HEALTHLINE · DAILY NEWS · WELLNESS · NUTRA</div>`, isDefault: false }]
  },
  {
    category: "stats",
    name: "Outcome Stats Grid",
    slug: "outcome-stats-grid",
    description: "Static metric cards styled like animated counters.",
    html: `<section class="bg-gray-950 text-white py-16 px-6"><div class="max-w-5xl mx-auto grid md:grid-cols-4 gap-4 text-center"><div class="bg-white/5 rounded-2xl p-6"><p class="text-4xl font-black text-emerald-400">92%</p><p class="text-gray-300">reported improvement</p></div><div class="bg-white/5 rounded-2xl p-6"><p class="text-4xl font-black text-emerald-400">14</p><p class="text-gray-300">day average routine</p></div><div class="bg-white/5 rounded-2xl p-6"><p class="text-4xl font-black text-emerald-400">50k+</p><p class="text-gray-300">happy customers</p></div><div class="bg-white/5 rounded-2xl p-6"><p class="text-4xl font-black text-emerald-400">4.9</p><p class="text-gray-300">star rating</p></div></div></section>`,
    tags: ["stats", "numbers", "proof", "dark"],
    previewDark: true,
    previewHeight: 330,
    variants: [{ name: "Light", html: `<section class="bg-white py-12 px-6"><div class="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 text-center"><div><p class="text-4xl font-black">50k+</p><p class="text-gray-500">customers</p></div><div><p class="text-4xl font-black">4.9</p><p class="text-gray-500">rating</p></div><div><p class="text-4xl font-black">60</p><p class="text-gray-500">day guarantee</p></div></div></section>`, isDefault: false }]
  },
  {
    category: "stats",
    name: "Purchase Counter Strip",
    slug: "purchase-counter-strip",
    description: "Social proof counter for recent orders.",
    html: `<div class="bg-emerald-600 text-white py-4 px-6"><div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center"><span class="text-3xl font-black">1,284</span><span class="font-bold">people bought this product in the last 24 hours</span></div></div>`,
    tags: ["stats", "counter", "purchases", "trust"],
    previewHeight: 160,
    variants: [{ name: "Warning", html: `<div class="bg-amber-400 text-gray-950 py-4 px-6 text-center font-black">842 orders placed today. Stock reserved for 10 minutes only.</div>`, isDefault: false }]
  },
  {
    category: "testimonials",
    name: "Photo Testimonial Card",
    slug: "photo-testimonial-card",
    description: "Single customer testimonial with avatar.",
    html: `<figure class="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"><div class="flex items-center gap-4 mb-4"><img class="h-14 w-14 rounded-full object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop" alt="Customer"><div><figcaption class="font-black text-gray-950">Anna M.</figcaption><p class="text-amber-400">★★★★★</p></div></div><blockquote class="text-gray-700 text-lg">“I was skeptical, but the routine was simple and I felt the difference quickly. The discount made it easy to try.”</blockquote><p class="text-sm text-gray-400 mt-4">Verified purchase</p></figure>`,
    tags: ["testimonial", "photo", "review", "stars"],
    previewHeight: 340,
    variants: [{ name: "No Photo", html: `<figure class="max-w-lg mx-auto bg-white rounded-2xl border p-6 text-center"><p class="text-amber-400 text-2xl">★★★★★</p><blockquote class="text-xl font-bold text-gray-950 mt-3">“Simple, fast, and worth it.”</blockquote><figcaption class="text-gray-500 mt-4">Verified customer</figcaption></figure>`, isDefault: false }]
  },
  {
    category: "testimonials",
    name: "Scroll Snap Reviews",
    slug: "scroll-snap-reviews",
    description: "Slider-like horizontal testimonial rail without JS.",
    html: `<div class="overflow-x-auto snap-x snap-mandatory flex gap-4 p-6 bg-gray-50"><div class="snap-center shrink-0 w-80 bg-white rounded-2xl p-6 border"><p class="text-amber-400">★★★★★</p><p class="font-bold mt-3">“Checkout was easy and delivery was fast.”</p><p class="text-gray-500 mt-4">Marco, verified buyer</p></div><div class="snap-center shrink-0 w-80 bg-white rounded-2xl p-6 border"><p class="text-amber-400">★★★★★</p><p class="font-bold mt-3">“The bundle price was the best deal.”</p><p class="text-gray-500 mt-4">Julia, verified buyer</p></div><div class="snap-center shrink-0 w-80 bg-white rounded-2xl p-6 border"><p class="text-amber-400">★★★★★</p><p class="font-bold mt-3">“I recommend starting with the quiz.”</p><p class="text-gray-500 mt-4">Owen, verified buyer</p></div></div>`,
    tags: ["testimonial", "slider", "scroll-snap", "reviews"],
    previewHeight: 260,
    variants: [{ name: "Dark", html: `<div class="overflow-x-auto snap-x flex gap-4 p-6 bg-gray-950"><div class="snap-center shrink-0 w-80 bg-white/10 text-white rounded-2xl p-6"><p class="text-amber-300">★★★★★</p><p class="font-bold mt-3">“A clean, convincing offer.”</p></div><div class="snap-center shrink-0 w-80 bg-white/10 text-white rounded-2xl p-6"><p class="text-amber-300">★★★★★</p><p class="font-bold mt-3">“The guarantee helped me decide.”</p></div></div>`, isDefault: false }]
  },
  {
    category: "banners",
    name: "Fixed Announcement Bar",
    slug: "fixed-announcement-bar",
    description: "Fixed top announcement banner.",
    html: `<div class="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white px-4 py-3 text-center font-bold">Flash Sale: 67% off today only. <a href="#offer" class="underline font-black">Claim discount</a></div>`,
    tags: ["banner", "announcement", "fixed", "sale"],
    previewHeight: 120,
    variants: [{ name: "Green", html: `<div class="fixed top-0 inset-x-0 z-50 bg-emerald-600 text-white px-4 py-3 text-center font-bold">Free shipping is active for the next 2 hours.</div>`, isDefault: false }]
  },
  {
    category: "banners",
    name: "Cookie Consent Bar",
    slug: "cookie-consent-bar",
    description: "Cookie consent bar with accept action.",
    html: `<div class="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center gap-4"><p class="text-sm text-gray-600 flex-1">We use cookies to improve checkout and personalize offers.</p><button class="bg-gray-950 text-white px-5 py-3 rounded-xl font-bold">Accept</button></div>`,
    tags: ["banner", "cookie", "consent", "fixed"],
    previewHeight: 180,
    variants: [{ name: "Dark", html: `<div class="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto bg-gray-950 text-white rounded-2xl p-4 flex items-center gap-4"><p class="text-sm flex-1">Cookies help us personalize your offer.</p><button class="bg-white text-gray-950 px-5 py-3 rounded-xl font-bold">OK</button></div>`, isDefault: false }]
  },
  {
    category: "navigation",
    name: "Sticky Header CTA",
    slug: "sticky-header-cta",
    description: "Simple sticky header with logo and CTA button.",
    html: `<header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-2xl font-black text-gray-950">Lend<span class="text-rose-500">Sphere</span></a><nav class="hidden md:flex items-center gap-6 text-sm font-bold text-gray-600"><a href="#benefits">Benefits</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a></nav><a href="#order" class="bg-rose-500 text-white px-5 py-3 rounded-full font-black">Order Now</a></div></header>`,
    tags: ["navigation", "sticky", "header", "cta"],
    previewHeight: 150,
    variants: [{ name: "Dark", html: `<header class="sticky top-0 z-40 bg-gray-950 text-white px-6 py-4"><div class="max-w-6xl mx-auto flex items-center justify-between"><a class="text-2xl font-black">LendSphere</a><a href="#order" class="bg-amber-400 text-gray-950 px-5 py-3 rounded-full font-black">Claim Offer</a></div></header>`, isDefault: false }]
  },
  {
    category: "navigation",
    name: "Minimal Offer Nav",
    slug: "minimal-offer-nav",
    description: "Compact navigation row for advertorial pages.",
    html: `<nav class="bg-gray-950 text-white px-6 py-3"><div class="max-w-5xl mx-auto flex items-center justify-between text-sm"><span class="font-black">Daily Wellness Report</span><div class="flex items-center gap-4"><a href="#story" class="text-gray-300">Story</a><a href="#proof" class="text-gray-300">Proof</a><a href="#offer" class="bg-white text-gray-950 px-4 py-2 rounded-full font-black">Offer</a></div></div></nav>`,
    tags: ["navigation", "advertorial", "minimal", "cta"],
    previewDark: true,
    previewHeight: 140,
    variants: [{ name: "Light", html: `<nav class="bg-white border-b px-6 py-3"><div class="max-w-5xl mx-auto flex items-center justify-between text-sm"><span class="font-black">Daily Wellness Report</span><a href="#offer" class="bg-gray-950 text-white px-4 py-2 rounded-full font-black">Offer</a></div></nav>`, isDefault: false }]
  }
] as const;

async function seedComponents(authorId: string) {
  const categoryBySlug = new Map<string, string>();

  for (const category of componentCategories) {
    const saved = await prisma.componentCategory.upsert({
      where: { slug: category.slug },
      update: { ...category, isActive: true },
      create: { ...category, isActive: true }
    });

    categoryBySlug.set(category.slug, saved.id);
  }

  for (const seed of componentSeeds) {
    const categoryId = categoryBySlug.get(seed.category);

    if (!categoryId) {
      throw new Error(`Missing component category: ${seed.category}`);
    }

    const component = await prisma.component.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        html: seed.html.trim(),
        previewBg: "previewBg" in seed ? seed.previewBg : undefined,
        previewDark: "previewDark" in seed ? seed.previewDark : false,
        previewHeight: seed.previewHeight,
        categoryId,
        tags: [...seed.tags],
        isPinned: "isPinned" in seed ? seed.isPinned : false,
        isPublic: true,
        authorId,
        deletedAt: null
      },
      create: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        html: seed.html.trim(),
        previewBg: "previewBg" in seed ? seed.previewBg : undefined,
        previewDark: "previewDark" in seed ? seed.previewDark : false,
        previewHeight: seed.previewHeight,
        categoryId,
        tags: [...seed.tags],
        isPinned: "isPinned" in seed ? seed.isPinned : false,
        isPublic: true,
        authorId
      }
    });

    await prisma.componentVariant.deleteMany({ where: { componentId: component.id } });
    await prisma.componentVariant.createMany({
      data: [
        {
          componentId: component.id,
          name: "Default",
          html: seed.html.trim(),
          sortOrder: 0,
          isDefault: true
        },
        ...seed.variants.map((variant, index) => ({
          componentId: component.id,
          name: variant.name,
          html: variant.html.trim(),
          sortOrder: (index + 1) * 10,
          isDefault: variant.isDefault
        }))
      ]
    });
  }
}

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

  await seedComponents(admin.id);
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
