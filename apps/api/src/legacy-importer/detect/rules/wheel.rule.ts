import type { DetectionRule, NodeCandidate } from "../model";

const WHEEL_PATTERNS = [
  "wheel",
  "spin",
  "fortune",
  "prize",
  "try your luck",
  "claim bonus"
];

export const wheelRule: DetectionRule = {
  kind: "wheel",
  score: (candidate) => scoreWheel(candidate)
};

function scoreWheel(candidate: NodeCandidate): number {
  let score = 0;
  const haystack = `${candidate.attrText} ${candidate.text}`;

  if (matchesAny(haystack, WHEEL_PATTERNS)) {
    score += 0.7;
  }
  if (candidate.attrText.includes("roulette") || candidate.attrText.includes("spinner")) {
    score += 0.2;
  }
  if (candidate.text.includes("%") || candidate.text.includes("discount")) {
    score += 0.1;
  }

  return clamp(score);
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
