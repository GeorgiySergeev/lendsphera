import { describe, expect, it } from "vitest";

import { parseLegacyHtml, toHtml, type Node } from "./dom";
import { stripPhpBlocks } from "./php-strip";

describe("legacy importer html parser", () => {
  it("round-trips unknown HTML byte-equivalent after PHP stripping", () => {
    const html = [
      "<!doctype html>",
      '<html><head><meta charset="utf-8"><title>X</title></head>',
      "<body>",
      "<?php echo $x; ?>",
      '<unknown-widget data-a="1">Hello</unknown-widget>',
      "</body></html>"
    ].join("");

    const stripped = stripPhpBlocks(html).strippedHtml;
    const parsed = parseLegacyHtml(html);
    const rendered = toHtml(parsed.root);
    expect(rendered).toBe(stripped);
  });

  it("recovers malformed HTML without throwing", () => {
    const malformed = "<html><body><div><p>broken<div>still works";

    expect(() => parseLegacyHtml(malformed)).not.toThrow();
    const parsed = parseLegacyHtml(malformed);
    expect(parsed.root.children.length).toBeGreaterThan(0);
  });

  it("strips inline script content but preserves Script node existence", () => {
    const html =
      "<html><body><script>window.a=1;console.log('x')</script><p>ok</p></body></html>";

    const parsed = parseLegacyHtml(html);
    const scripts = collectNodes(parsed.root, "Script");
    expect(scripts.length).toBe(1);
    expect(scripts[0]).toEqual(
      expect.objectContaining({
        type: "Script",
        externalSrc: null
      })
    );
  });
});

function collectNodes<T extends Node["type"]>(
  node: Node,
  targetType: T
): Array<Extract<Node, { type: T }>> {
  const out: Array<Extract<Node, { type: T }>> = [];
  if (node.type === targetType) {
    out.push(node as Extract<Node, { type: T }>);
  }

  if (node.type === "Document" || node.type === "Element") {
    for (const child of node.children) {
      out.push(...collectNodes(child, targetType));
    }
  }

  return out;
}
