import {
  countDescendantTag,
  hasDescendantTag,
  type DetectionRule,
  type NodeCandidate
} from "../model";

const FORM_PATTERNS = ["form", "lead", "contact", "submit", "input", "phone", "email"];

export const formRule: DetectionRule = {
  kind: "form",
  score: (candidate) => scoreForm(candidate)
};

function scoreForm(candidate: NodeCandidate): number {
  let score = 0;
  const haystack = `${candidate.attrText} ${candidate.text}`;

  if (candidate.node.tagName === "form" || hasDescendantTag(candidate.node, "form")) {
    score += 0.5;
  }
  if (countDescendantTag(candidate.node, "input") >= 2) {
    score += 0.25;
  }
  if (matchesAny(haystack, FORM_PATTERNS)) {
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
