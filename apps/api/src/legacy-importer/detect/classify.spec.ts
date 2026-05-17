import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { BlockKind } from "./model";
import { classifyBlocks } from "./classify";
import { parseLegacyHtml, type Node } from "../parser/dom";

interface FixtureExpected {
  id: string;
  kind: Exclude<BlockKind, "unknown">;
}

interface LabeledFixture {
  name: string;
  html: string;
  expected: FixtureExpected[];
}

describe("legacy importer block classification", () => {
  it("returns `{ nodeRef, kind, confidence }` entries", () => {
    const fixture = loadFixture("basic-blocks.json");
    const parsed = parseLegacyHtml(fixture.html);

    const result = classifyBlocks(parsed.root);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item).toEqual(
        expect.objectContaining({
          nodeRef: expect.any(String),
          kind: expect.any(String),
          confidence: expect.any(Number)
        })
      );
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("reaches >= 80% precision on labeled fixtures", () => {
    const fixtures = ["basic-blocks.json", "mixed-noise.json"].map(loadFixture);

    let truePositive = 0;
    let predictedTotal = 0;

    for (const fixture of fixtures) {
      const parsed = parseLegacyHtml(fixture.html);
      const predictions = classifyBlocks(parsed.root);
      const idByRef = buildNearestIdIndex(parsed.root);
      const expectedMap = new Map(
        fixture.expected.map((entry) => [entry.id, entry.kind])
      );
      const bestPredictionById = new Map<string, ClassifiedLike>();

      for (const prediction of predictions) {
        const id = idByRef.get(prediction.nodeRef);
        if (!id) {
          continue;
        }
        const prev = bestPredictionById.get(id);
        if (!prev || prediction.confidence > prev.confidence) {
          bestPredictionById.set(id, prediction);
        }
      }

      predictedTotal += bestPredictionById.size;
      for (const [id, prediction] of bestPredictionById) {
        if (expectedMap.get(id) === prediction.kind) {
          truePositive += 1;
        }
      }
    }

    const precision = predictedTotal === 0 ? 0 : truePositive / predictedTotal;
    expect(precision).toBeGreaterThanOrEqual(0.8);
  });

  it("resolves overlaps to avoid duplicate nested picks", () => {
    const html =
      "<html><body><section id='hero-wrap' class='hero'>" +
      "<div id='hero-inner'><h1>Order now and save</h1><button>Buy now</button></div>" +
      "</section></body></html>";
    const parsed = parseLegacyHtml(html);
    const result = classifyBlocks(parsed.root);

    expect(result.length).toBe(1);
  });
});

function loadFixture(fileName: string): LabeledFixture {
  const fixturePath = join(
    process.cwd(),
    "test",
    "fixtures",
    "legacy",
    "labeled",
    fileName
  );

  return JSON.parse(readFileSync(fixturePath, "utf8")) as LabeledFixture;
}

interface ClassifiedLike {
  kind: BlockKind;
  confidence: number;
}

function buildNearestIdIndex(root: Node): Map<string, string> {
  const map = new Map<string, string>();
  walk(root, "0", null);
  return map;

  function walk(node: Node, path: string, currentId: string | null): void {
    if (node.type !== "Document" && node.type !== "Element") {
      return;
    }
    let nextId = currentId;
    if (node.type === "Element") {
      const elementId = node.attrs.id;
      if (elementId) {
        nextId = elementId;
      }
    }
    if (nextId) {
      map.set(path, nextId);
    }
    node.children.forEach((child, index) => walk(child, `${path}.${index}`, nextId));
  }
}
