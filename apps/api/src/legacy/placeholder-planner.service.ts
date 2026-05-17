import { Injectable } from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type PriceContext = {
  price: string | null;
  oldPrice: string | null;
  currency: string | null;
};

export type ReplacementEntry = {
  key: string;
  before: string;
  after: string;
  context: string;
  file: string;
  offset: number;
};

export type PlaceholderManifest = {
  landingId: string;
  legacyRef: string;
  createdAt: string;
  entries: ReplacementEntry[];
};

export type PlanResult = {
  manifest: PlaceholderManifest;
  patches: FilePatch[];
};

export type FilePatch = {
  file: string;
  original: string;
  patched: string;
};

const TEXT_EXTENSIONS = new Set([
  "php",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "json",
  "txt",
  "xml",
  "svg",
  "tpl"
]);

const FALSE_POSITIVE_SUFFIX =
  /^(rem|em|px|vh|vw|vmin|vmax|ch|ex|%|s|ms|deg|rad|turn|fr)\b/i;
const FALSE_POSITIVE_PREFIX = /[a-z_]$/i;
const VERSION_PATTERN = /^\.\d/;

@Injectable()
export class PlaceholderPlannerService {
  async plan(
    landingId: string,
    legacyRef: string,
    rootPath: string,
    prices: PriceContext
  ): Promise<PlanResult> {
    const landingDir = path.resolve(rootPath, legacyRef);
    const textFiles = await this.collectTextFiles(landingDir);
    const candidates = this.buildSearchCandidates(prices);

    const entries: ReplacementEntry[] = [];
    const patches: FilePatch[] = [];

    for (const { relativePath, absolutePath } of textFiles) {
      const original = await readFile(absolutePath, "utf8");
      const lines = original.split("\n");
      const fileEntries = this.findReplacements(
        relativePath,
        original,
        lines,
        candidates
      );

      if (fileEntries.length === 0) continue;

      entries.push(...fileEntries);

      const patched = this.applyReplacements(original, fileEntries);
      patches.push({ file: relativePath, original, patched });
    }

    const manifest: PlaceholderManifest = {
      landingId,
      legacyRef,
      createdAt: new Date().toISOString(),
      entries
    };

    return { manifest, patches };
  }

  isAlreadyMigrated(manifest: unknown): boolean {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest))
      return false;
    const m = manifest as Record<string, unknown>;
    return Array.isArray(m.entries) && m.entries.length > 0;
  }

  private buildSearchCandidates(
    prices: PriceContext
  ): Array<{ pattern: string; key: string }> {
    const candidates: Array<{ pattern: string; key: string }> = [];

    const addVariants = (value: string, key: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      candidates.push({ pattern: trimmed, key });

      const withComma = trimmed.replace(".", ",");
      if (withComma !== trimmed) {
        candidates.push({ pattern: withComma, key });
      }

      const withDot = trimmed.replace(",", ".");
      if (withDot !== trimmed) {
        candidates.push({ pattern: withDot, key });
      }

      if (trimmed.endsWith("0") && trimmed.includes(".")) {
        const shorter = trimmed.replace(/0+$/, "").replace(/\.$/, "");
        if (shorter !== trimmed && shorter.length >= 1) {
          candidates.push({ pattern: shorter, key });
        }
      }
    };

    if (prices.price) addVariants(prices.price, "LS_PRICE");
    if (prices.oldPrice) addVariants(prices.oldPrice, "LS_OLD_PRICE");

    candidates.sort((a, b) => b.pattern.length - a.pattern.length);

    return candidates;
  }

  private findReplacements(
    relativePath: string,
    content: string,
    lines: string[],
    candidates: Array<{ pattern: string; key: string }>
  ): ReplacementEntry[] {
    const results: ReplacementEntry[] = [];
    const usedOffsets = new Set<number>();

    for (const { pattern, key } of candidates) {
      let searchFrom = 0;

      while (true) {
        const offset = content.indexOf(pattern, searchFrom);
        if (offset === -1) break;

        searchFrom = offset + pattern.length;

        if (this.isFalsePositive(content, offset, pattern)) continue;

        const alreadyUsed = [...usedOffsets].some(
          (used) =>
            (offset >= used && offset < used + pattern.length) ||
            (used >= offset && used < offset + pattern.length)
        );
        if (alreadyUsed) continue;

        usedOffsets.add(offset);

        const lineIndex = this.getLineIndex(content, offset);
        const contextSnippet = this.extractContext(lines, lineIndex, 3);

        results.push({
          key,
          before: pattern,
          after: `{{${key}}}`,
          context: contextSnippet,
          file: relativePath,
          offset
        });
      }
    }

    return results.sort((a, b) => a.offset - b.offset);
  }

  private isFalsePositive(content: string, offset: number, pattern: string): boolean {
    const afterEnd = content.slice(offset + pattern.length);
    if (FALSE_POSITIVE_SUFFIX.test(afterEnd)) return true;

    if (VERSION_PATTERN.test(afterEnd)) return true;

    const beforeStart = content.slice(Math.max(0, offset - 1), offset);
    if (FALSE_POSITIVE_PREFIX.test(beforeStart)) return true;

    const placeholder = content.slice(Math.max(0, offset - 2), offset);
    if (placeholder === "{{") return true;

    return false;
  }

  private applyReplacements(original: string, entries: ReplacementEntry[]): string {
    const sorted = [...entries].sort((a, b) => b.offset - a.offset);
    let result = original;

    for (const entry of sorted) {
      result =
        result.slice(0, entry.offset) +
        entry.after +
        result.slice(entry.offset + entry.before.length);
    }

    return result;
  }

  private getLineIndex(content: string, offset: number): number {
    let line = 0;
    for (let i = 0; i < offset; i++) {
      if (content[i] === "\n") line++;
    }
    return line;
  }

  private extractContext(lines: string[], lineIndex: number, radius: number): string {
    const start = Math.max(0, lineIndex - radius);
    const end = Math.min(lines.length - 1, lineIndex + radius);
    return lines.slice(start, end + 1).join("\n");
  }

  private async collectTextFiles(
    dir: string
  ): Promise<Array<{ relativePath: string; absolutePath: string }>> {
    const results: Array<{ relativePath: string; absolutePath: string }> = [];

    const walk = async (current: string, prefix: string) => {
      let entries;
      try {
        entries = await readdir(current, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const abs = path.join(current, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await walk(abs, rel);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).replace(".", "").toLowerCase();
          if (TEXT_EXTENSIONS.has(ext)) {
            results.push({ relativePath: rel, absolutePath: abs });
          }
        }
      }
    };

    await walk(dir, "");
    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }
}
