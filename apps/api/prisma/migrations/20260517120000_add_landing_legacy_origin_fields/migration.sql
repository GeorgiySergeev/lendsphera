-- Add legacy inventory import support on Landing
CREATE TYPE "LandingOrigin" AS ENUM ('NATIVE', 'WRAPPED_LEGACY');

ALTER TABLE "Landing"
  ADD COLUMN "origin" "LandingOrigin" NOT NULL DEFAULT 'NATIVE',
  ADD COLUMN "legacyRef" TEXT,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Landing_legacyRef_key" ON "Landing"("legacyRef");