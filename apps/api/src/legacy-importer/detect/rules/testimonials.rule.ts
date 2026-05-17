import { countDescendantTag, type DetectionRule, type NodeCandidate } from "../model";

const TESTIMONIAL_PATTERNS = [
  "testimonial",
  "review",
  "feedback",
  "what people say",
  "rating",
  "stars"
];

export const testimonialsRule: DetectionRule = {
  kind: "testimonials",
  score: (candidate) => scoreTestimonials(candidate)
};

function scoreTestimonials(candidate: NodeCandidate): number {
  let score = 0;
  const haystack = `${candidate.attrText} ${candidate.text}`;

  if (matchesAny(haystack, TESTIMONIAL_PATTERNS)) {
    score += 0.55;
  }
  if (countDescendantTag(candidate.node, "blockquote") >= 1) {
    score += 0.2;
  }
  if ((candidate.text.match(/"/g) ?? []).length >= 2) {
    score += 0.1;
  }
  if (candidate.text.includes("★") || candidate.text.includes("5/5")) {
    score += 0.15;
  }

  return clamp(score);
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
