-- AlterTable
ALTER TABLE "LegacyLanding"
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "branch" TEXT,
ADD COLUMN "commitSha" TEXT,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "syncStatus" TEXT,
ADD COLUMN "syncError" TEXT;

-- Indexes
CREATE INDEX "LegacyLanding_sourceUrl_idx" ON "LegacyLanding"("sourceUrl");
CREATE INDEX "LegacyLanding_syncStatus_idx" ON "LegacyLanding"("syncStatus");
