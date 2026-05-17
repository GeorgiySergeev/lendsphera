import { Injectable } from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type LegacyScanCandidate = {
  geo: string;
  legacyRef: string;
  landingName: string;
  priceCandidate: number | null;
  productHint: string | null;
  productHints: string[];
};

const PRICE_REGEX =
  /(?:\$|�|�|USD|EUR|GBP|UAH|PLN|RON|TRY|BRL|MXN|ARS|COP|PEN|CZK|SEK|CAD)\s*([0-9]{1,5}(?:[.,][0-9]{2})?)|([0-9]{1,5}(?:[.,][0-9]{2})?)\s*(?:\$|�|�|USD|EUR|GBP|UAH|PLN|RON|TRY|BRL|MXN|ARS|COP|PEN|CZK|SEK|CAD)/i;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

@Injectable()
export class LegacyScanService {
  async scan(rootPath: string): Promise<LegacyScanCandidate[]> {
    const landerRoot = path.resolve(rootPath, "lander");
    const geos = await this.listDirs(landerRoot);
    const items: LegacyScanCandidate[] = [];

    for (const geo of geos) {
      const geoPath = path.join(landerRoot, geo);
      const verticals = await this.listDirs(geoPath);

      for (const vertical of verticals) {
        const verticalPath = path.join(geoPath, vertical);
        const slugs = await this.listDirs(verticalPath);

        for (const slug of slugs) {
          const landingPath = path.join(verticalPath, slug);
          const indexPath = path.join(landingPath, "index.php");
          const fileText = await this.safeReadText(indexPath);
          const priceCandidate = this.extractPriceCandidate(fileText);
          const productHints = await this.extractProductHints(landingPath, slug);

          items.push({
            geo,
            landingName: this.humanizeSlug(slug),
            legacyRef: path.posix.join("lander", geo, vertical, slug),
            priceCandidate,
            productHint: productHints[0] ?? null,
            productHints
          });
        }
      }
    }

    return items.sort((a, b) => a.legacyRef.localeCompare(b.legacyRef));
  }

  private extractPriceCandidate(text: string): number | null {
    if (!text) return null;
    const match = PRICE_REGEX.exec(text);
    const raw = match?.[1] ?? match?.[2];

    if (!raw) return null;

    const normalized = raw.replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private async extractProductHints(
    landingPath: string,
    slug: string
  ): Promise<string[]> {
    const hints = new Set<string>();
    const slugHint = this.guessProductFromText(slug);

    if (slugHint) {
      hints.add(slugHint);
    }

    const filesDir = path.join(landingPath, "files");
    const fileEntries = await this.safeListDirEntries(filesDir);

    for (const entry of fileEntries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();

      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      const hint = this.guessProductFromText(path.basename(entry.name, ext));

      if (hint) {
        hints.add(hint);
      }
    }

    return [...hints];
  }

  private guessProductFromText(value: string): string | null {
    const normalized = value
      .replace(/[_-]+/g, " ")
      .replace(
        /\b(offer|lander|landing|index|img|image|banner|hero|buy|new|v\d+)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return null;

    const tokens = normalized.split(" ").filter((token) => token.length >= 3);

    if (!tokens.length) return null;

    return tokens
      .slice(0, 4)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(" ");
  }

  private humanizeSlug(slug: string): string {
    const pretty = slug.replace(/[_-]+/g, " ").trim();

    if (!pretty) return slug;

    return pretty.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private async listDirs(dirPath: string): Promise<string[]> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  }

  private async safeReadText(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, "utf8");
    } catch {
      return "";
    }
  }

  private async safeListDirEntries(dirPath: string) {
    try {
      return await readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }
  }
}
