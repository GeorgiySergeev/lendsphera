-- CreateEnum
CREATE TYPE "BuilderPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BuilderVersionStatus" AS ENUM ('AUTOSAVE', 'MANUAL', 'PUBLISHED');

-- CreateTable
CREATE TABLE "BuilderPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BuilderPageStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "html" TEXT,
    "css" TEXT,
    "components" JSONB,
    "styles" JSONB,
    "assets" JSONB,
    "device" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BuilderPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderPageVersion" (
    "id" TEXT NOT NULL,
    "builderPageId" TEXT NOT NULL,
    "versionNum" INTEGER NOT NULL,
    "status" "BuilderVersionStatus" NOT NULL DEFAULT 'AUTOSAVE',
    "html" TEXT,
    "css" TEXT,
    "components" JSONB,
    "styles" JSONB,
    "assets" JSONB,
    "device" VARCHAR(16),
    "message" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuilderPage_currentVersionId_key" ON "BuilderPage"("currentVersionId");

-- CreateIndex
CREATE INDEX "BuilderPage_ownerId_updatedAt_idx" ON "BuilderPage"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "BuilderPage_status_deletedAt_idx" ON "BuilderPage"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "BuilderPageVersion_builderPageId_createdAt_idx" ON "BuilderPageVersion"("builderPageId", "createdAt");

-- CreateIndex
CREATE INDEX "BuilderPageVersion_authorId_idx" ON "BuilderPageVersion"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderPageVersion_builderPageId_versionNum_key" ON "BuilderPageVersion"("builderPageId", "versionNum");

-- AddForeignKey
ALTER TABLE "BuilderPage" ADD CONSTRAINT "BuilderPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPage" ADD CONSTRAINT "BuilderPage_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "BuilderPageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPageVersion" ADD CONSTRAINT "BuilderPageVersion_builderPageId_fkey" FOREIGN KEY ("builderPageId") REFERENCES "BuilderPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPageVersion" ADD CONSTRAINT "BuilderPageVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
