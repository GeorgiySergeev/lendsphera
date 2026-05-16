import { BadRequestException } from "@nestjs/common";
import { memoryStorage } from "multer";

export const mediaUploadConfig = {
  storage: memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
    files: 20 // max 20 files per batch
  },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile: boolean) => void
  ) => {
    const ALLOWED_MIME_PREFIXES = ["image/", "video/", "font/"];
    const ALLOWED_MIME_EXACT = [
      "application/pdf",
      "application/zip",
      "application/x-tar",
      "application/gzip",
      "application/font-woff",
      "application/font-woff2",
      "application/vnd.ms-fontobject",
      "application/x-font-ttf"
    ];

    const allowed =
      ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p)) ||
      ALLOWED_MIME_EXACT.includes(file.mimetype);

    if (allowed) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
    }
  }
};
