import type { LandingContext, RuntimeVars } from "@workspace/types";

function composeRuntimeVars(context: LandingContext): RuntimeVars["vars"] {
  const locale = toLocale(context.lang);
  const vars: RuntimeVars["vars"] = {
    LS_CTA: context.placeholders.CTA ?? context.placeholders.cta ?? "",
    LS_CURRENCY: context.currency ?? "",
    LS_DISCLAIMER:
      context.placeholders.DISCLAIMER ?? context.placeholders.disclaimer ?? "",
    LS_DISCOUNT: context.discount ?? "",
    LS_OLD_PRICE: formatMoney(context.oldPrice, locale),
    LS_PIXEL_ID: context.pixels?.pixelId ?? context.pixels?.facebookPixelId ?? "",
    LS_POSTBACK_URL: context.postbacks?.url ?? context.postbacks?.postbackUrl ?? "",
    LS_PRICE: formatMoney(context.price, locale),
    LS_PRODUCT_IMAGE: context.productImage ?? "",
    LS_PRODUCT_NAME: context.productName ?? ""
  };

  for (const [key, value] of Object.entries(context.placeholders)) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    vars[`LS_${trimmed}`] = value;
  }

  return vars;
}

function formatMoney(value: string | null, locale: string): string {
  if (!value) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(parsed);
}

function toLocale(lang: string): string {
  if (lang.includes("-")) return lang;
  switch (lang.toLowerCase()) {
    case "de":
      return "de-DE";
    case "en":
      return "en-US";
    case "uk":
      return "uk-UA";
    case "ru":
      return "ru-RU";
    default:
      return "en-US";
  }
}

export { composeRuntimeVars, formatMoney, toLocale };
