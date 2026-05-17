import { parse } from "parse5";

import { stripPhpBlocks } from "./php-strip";

export type Node = DocumentNode | ElementNode | TextNode | CommentNode | ScriptNode;

export interface DocumentNode {
  type: "Document";
  children: Node[];
  originalHtml: string;
}

export interface ElementNode {
  type: "Element";
  tagName: string;
  attrs: Record<string, string>;
  children: Node[];
}

export interface TextNode {
  type: "Text";
  value: string;
}

export interface CommentNode {
  type: "Comment";
  value: string;
}

export interface ScriptNode {
  type: "Script";
  attrs: Record<string, string>;
  externalSrc: string | null;
}

export interface ParsedHtmlTree {
  root: DocumentNode;
  phpMarkers: string[];
}

type Parse5Node = {
  nodeName?: string;
  childNodes?: Parse5Node[];
  attrs?: Array<{ name: string; value: string }>;
  value?: string;
  data?: string;
  tagName?: string;
};

export function parseLegacyHtml(input: string): ParsedHtmlTree {
  const { strippedHtml, phpMarkers } = stripPhpBlocks(input);
  const document = parse(strippedHtml, { sourceCodeLocationInfo: true }) as Parse5Node;

  const root: DocumentNode = {
    type: "Document",
    children: mapChildren(document.childNodes ?? []),
    originalHtml: strippedHtml
  };

  return { root, phpMarkers };
}

export function toHtml(root: DocumentNode): string {
  return root.originalHtml;
}

function mapChildren(nodes: Parse5Node[]): Node[] {
  const output: Node[] = [];

  for (const node of nodes) {
    const mapped = mapNode(node);
    if (mapped) {
      output.push(mapped);
    }
  }

  return output;
}

function mapNode(node: Parse5Node): Node | null {
  if (node.nodeName === "#text") {
    return { type: "Text", value: node.value ?? "" };
  }

  if (node.nodeName === "#comment") {
    return { type: "Comment", value: node.data ?? "" };
  }

  if (node.nodeName === "#documentType") {
    return null;
  }

  const tagName = node.tagName ?? "";
  if (tagName === "script") {
    const attrs = toAttrs(node.attrs ?? []);
    return {
      type: "Script",
      attrs,
      externalSrc: attrs.src ?? null
    };
  }

  return {
    type: "Element",
    tagName,
    attrs: toAttrs(node.attrs ?? []),
    children: mapChildren(node.childNodes ?? [])
  };
}

function toAttrs(attrs: Array<{ name: string; value: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of attrs) {
    out[attr.name] = attr.value;
  }
  return out;
}
