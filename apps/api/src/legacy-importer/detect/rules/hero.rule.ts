import type { DetectionRule, NodeCandidate } from "../model";

const HERO_PATTERNS = [
  "hero",
  "headline",
  "offer",
  "limited",
  "order now",
  "cta",
  "call to action"
];

export const heroRule: DetectionRule = {
  kind: "hero",
  score: (candidate) => scoreHero(candidate)
};

function scoreHero(candidate: NodeCandidate): number {
  let score = 0;
  const haystack = `${candidate.attrText} ${candidate.text}`;

  if (matchesAny(haystack, HERO_PATTERNS)) {
    score += 0.45;
  }
  if (candidate.node.tagName === "header" || candidate.node.tagName === "section") {
    score += 0.15;
  }
  if (hasHeadline(candidate.text)) {
    score += 0.2;
  }
  if (hasCta(candidate.text)) {
    score += 0.2;
  }

  return clamp(score);
}

function hasHeadline(text: string): boolean {
  return text.includes("!") || text.split(" ").length > 8;
}

function hasCta(text: string): boolean {
  return text.includes("buy") || text.includes("order") || text.includes("get started");
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
