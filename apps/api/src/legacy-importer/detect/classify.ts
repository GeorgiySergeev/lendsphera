import type { Node } from "../parser/dom";
import {
  collectElementCandidates,
  type ClassifiedBlock,
  type DetectionRule
} from "./model";
import { formRule } from "./rules/form.rule";
import { heroRule } from "./rules/hero.rule";
import { priceRule } from "./rules/price.rule";
import { testimonialsRule } from "./rules/testimonials.rule";
import { wheelRule } from "./rules/wheel.rule";

const RULES: DetectionRule[] = [
  heroRule,
  formRule,
  priceRule,
  testimonialsRule,
  wheelRule
];
const DETECT_THRESHOLD = 0.55;

export function classifyBlocks(root: Node): ClassifiedBlock[] {
  const candidates = collectElementCandidates(root);
  const scored = candidates
    .map((candidate) => {
      let bestKind: ClassifiedBlock["kind"] = "unknown";
      let bestScore = 0;
      for (const rule of RULES) {
        const score = clamp(rule.score(candidate));
        if (score > bestScore) {
          bestScore = score;
          bestKind = rule.kind;
        }
      }

      if (bestScore < DETECT_THRESHOLD) {
        bestKind = "unknown";
      }

      return { nodeRef: candidate.nodeRef, kind: bestKind, confidence: round(bestScore) };
    })
    .filter((entry) => entry.kind !== "unknown")
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.nodeRef.length - a.nodeRef.length;
    });

  const selected: ClassifiedBlock[] = [];
  for (const entry of scored) {
    if (overlapsWithSelected(entry.nodeRef, selected)) {
      continue;
    }
    selected.push(entry);
  }

  return selected;
}

function overlapsWithSelected(nodeRef: string, selected: ClassifiedBlock[]): boolean {
  for (const item of selected) {
    if (isSameOrNested(nodeRef, item.nodeRef) || isSameOrNested(item.nodeRef, nodeRef)) {
      return true;
    }
  }
  return false;
}

function isSameOrNested(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b}.`);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
