import type { ElementNode, Node } from "../parser/dom";

export type BlockKind = "hero" | "form" | "price" | "testimonials" | "wheel" | "unknown";

export interface NodeCandidate {
  nodeRef: string;
  node: ElementNode;
  text: string;
  attrText: string;
}

export interface DetectionRule {
  kind: Exclude<BlockKind, "unknown">;
  score: (candidate: NodeCandidate) => number;
}

export interface ClassifiedBlock {
  nodeRef: string;
  kind: BlockKind;
  confidence: number;
}

export function collectElementCandidates(root: Node): NodeCandidate[] {
  const out: NodeCandidate[] = [];

  walk(root, "0");
  return out;

  function walk(node: Node, path: string): void {
    if (node.type !== "Document" && node.type !== "Element") {
      return;
    }

    if (node.type === "Element" && isDetectableElement(node)) {
      out.push({
        nodeRef: path,
        node,
        text: getText(node).toLowerCase(),
        attrText: getAttrText(node).toLowerCase()
      });
    }

    node.children.forEach((child, index) => walk(child, `${path}.${index}`));
  }
}

function isDetectableElement(node: ElementNode): boolean {
  return !["html", "body", "head", "meta", "title", "link", "style"].includes(
    node.tagName
  );
}

export function hasDescendantTag(node: ElementNode, tagName: string): boolean {
  for (const child of node.children) {
    if (child.type !== "Element") {
      continue;
    }
    if (child.tagName === tagName) {
      return true;
    }
    if (hasDescendantTag(child, tagName)) {
      return true;
    }
  }
  return false;
}

export function countDescendantTag(node: ElementNode, tagName: string): number {
  let count = 0;
  for (const child of node.children) {
    if (child.type !== "Element") {
      continue;
    }
    if (child.tagName === tagName) {
      count += 1;
    }
    count += countDescendantTag(child, tagName);
  }
  return count;
}

function getText(node: ElementNode): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "Text") {
      out += `${child.value} `;
      continue;
    }
    if (child.type === "Element") {
      out += `${getText(child)} `;
    }
  }
  return out.trim();
}

function getAttrText(node: ElementNode): string {
  return Object.values(node.attrs).join(" ");
}
