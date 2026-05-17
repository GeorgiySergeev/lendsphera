-- CreateEnum
CREATE TYPE "ComplianceIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'AUTO_FIXED');

-- CreateEnum
CREATE TYPE "ComplianceIssueSeverity" AS ENUM ('MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ComplianceIssue" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "status" "ComplianceIssueStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "ComplianceIssueSeverity" NOT NULL DEFAULT 'HIGH',
    "details" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "acknowledgmentReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "autoFixedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceIssue_landingId_issueKey_key" ON "ComplianceIssue"("landingId", "issueKey");

-- CreateIndex
CREATE INDEX "ComplianceIssue_status_detectedAt_idx" ON "ComplianceIssue"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "ComplianceIssue_landingId_status_idx" ON "ComplianceIssue"("landingId", "status");

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
