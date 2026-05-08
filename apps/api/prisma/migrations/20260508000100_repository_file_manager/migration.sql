-- AlterTable
ALTER TABLE "LegacyFile"
ADD COLUMN "extension" TEXT,
ADD COLUMN "textContent" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedById" TEXT;

-- Backfill extension for existing rows.
UPDATE "LegacyFile"
SET "extension" = lower(regexp_replace("path", '^.*\.([^.\/]+)$', '\1'))
WHERE "path" LIKE '%.%';

-- Indexes
CREATE INDEX "LegacyFile_extension_idx" ON "LegacyFile"("extension");

CREATE INDEX "LegacyFile_fts_idx" ON "LegacyFile"
USING GIN (to_tsvector('simple', "path" || ' ' || coalesce("textContent", '')));

CREATE INDEX "LegacyFile_path_trgm_idx" ON "LegacyFile" USING GIN ("path" gin_trgm_ops);
