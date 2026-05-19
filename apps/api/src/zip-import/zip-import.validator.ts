import { BadRequestException } from "@nestjs/common";
import AdmZip from "adm-zip";
import type { ZipValidationResult } from "./zip-import.types";

const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_ENTRIES = 500;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB
const ENTRYPOINT_PATTERN = /(?:^|\/)index\.(?:html?|php)$/i;
const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".jsp",
  ".asp",
  ".aspx",
  ".dll",
  ".so",
  ".dylib"
]);

export function validateZip(file: Express.Multer.File): ZipValidationResult {
  if (!file.mimetype || !file.mimetype.includes("zip")) {
    return { valid: false, error: "File must be a ZIP archive." };
  }

  if (file.size > MAX_ZIP_SIZE) {
    return {
      valid: false,
      error: `ZIP file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024} MB.`
    };
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(file.buffer);
  } catch {
    return { valid: false, error: "Invalid or corrupted ZIP file." };
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_ENTRIES) {
    return {
      valid: false,
      error: `ZIP contains too many entries (${entries.length}). Maximum is ${MAX_ENTRIES}.`
    };
  }

  const entrypoint = entries.find((entry) => isSupportedEntrypoint(entry.entryName));
  if (!entrypoint) {
    return {
      valid: false,
      error: "ZIP archive must contain an index.html or index.php file."
    };
  }

  let uncompressedSize = 0;
  for (const entry of entries) {
    const entryName = entry.entryName;

    if (entryName.startsWith("/") || entryName.startsWith("\\")) {
      return {
        valid: false,
        error: `Absolute paths are not allowed: ${entryName}`
      };
    }

    if (
      entryName.includes("..") ||
      entryName.includes("../") ||
      entryName.includes("..\\")
    ) {
      return {
        valid: false,
        error: `Path traversal detected: ${entryName}`
      };
    }

    const lowerName = entryName.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        return {
          valid: false,
          error: `Executable/server files are not allowed: ${entryName}`
        };
      }
    }

    uncompressedSize += entry.header.size;
    if (uncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      return {
        valid: false,
        error: `Uncompressed size exceeds ${MAX_UNCOMPRESSED_SIZE / 1024 / 1024} MB.`
      };
    }
  }

  return { valid: true, entries: entries.length, uncompressedSize };
}

export function assertValidZip(file: Express.Multer.File): ZipValidationResult {
  const result = validateZip(file);
  if (!result.valid) {
    throw new BadRequestException(result.error);
  }
  return result;
}

function isSupportedEntrypoint(entryName: string) {
  return ENTRYPOINT_PATTERN.test(normalizeZipEntryName(entryName));
}

function normalizeZipEntryName(entryName: string) {
  return entryName.replace(/\\/g, "/").replace(/^\.?\//, "");
}
