CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "landingId" TEXT NOT NULL,
  "submitterId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Approval_landingId_status_createdAt_idx" ON "Approval"("landingId", "status", "createdAt");
CREATE INDEX "Approval_submitterId_createdAt_idx" ON "Approval"("submitterId", "createdAt");
CREATE INDEX "Approval_reviewerId_createdAt_idx" ON "Approval"("reviewerId", "createdAt");

ALTER TABLE "Approval" ADD CONSTRAINT "Approval_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;