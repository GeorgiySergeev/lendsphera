import type { DetectionRule, NodeCandidate } from "../model";

const PRICE_PATTERNS = [
  "price",
  "discount",
  "sale",
  "only",
  "$",
  "€",
  "£",
  "usd",
  "eur",
  "old price",
  "new price"
];

export const priceRule: DetectionRule = {
  kind: "price",
  score: (candidate) => scorePrice(candidate)
};

function scorePrice(candidate: NodeCandidate): number {
  let score = 0;
  const haystack = `${candidate.attrText} ${candidate.text}`;

  if (matchesAny(haystack, PRICE_PATTERNS)) {
    score += 0.5;
  }
  if (/\b\d{1,4}\s?(usd|eur|uah|pln|ron)?\b/i.test(candidate.text)) {
    score += 0.25;
  }
  if (candidate.attrText.includes("price") || candidate.attrText.includes("cost")) {
    score += 0.25;
  }

  return clamp(score);
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
