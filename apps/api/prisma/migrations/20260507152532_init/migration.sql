-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "LandingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('AUTOSAVE', 'MANUAL', 'PUBLISHED', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('REACT', 'VANILLA_JS', 'IFRAME', 'WEB_COMPONENT');

-- CreateEnum
CREATE TYPE "WidgetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'FONT', 'ICON', 'DOCUMENT', 'ARCHIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'PUBLISH', 'UNPUBLISH', 'DUPLICATE', 'LOGIN', 'LOGOUT', 'IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "PublishTarget" AS ENUM ('CLOUDFLARE_PAGES', 'S3_CDN', 'VERCEL', 'CUSTOM_HOST');

-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlaceholderType" AS ENUM ('TEXT', 'TEXTAREA', 'RICHTEXT', 'NUMBER', 'BOOLEAN', 'COLOR', 'IMAGE', 'VIDEO', 'SELECT', 'MULTISELECT', 'ARRAY', 'URL', 'DATE', 'JSON');

-- CreateEnum
CREATE TYPE "LegacySource" AS ENUM ('UPLOAD', 'GIT_REPO', 'FTP', 'S3_IMPORT', 'ZIP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" VARCHAR(12) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geo" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" TEXT NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "currency" VARCHAR(4) NOT NULL,
    "flagEmoji" TEXT,
    "flagUrl" TEXT,
    "timezone" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "previewUrl" TEXT,
    "baseHtml" TEXT NOT NULL,
    "baseCss" TEXT,
    "baseJs" TEXT,
    "grapesJson" JSONB,
    "placeholders" JSONB NOT NULL,
    "blocksJson" JSONB,
    "categoryId" TEXT,
    "authorId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateGeo" (
    "templateId" TEXT NOT NULL,
    "geoId" TEXT NOT NULL,

    CONSTRAINT "TemplateGeo_pkey" PRIMARY KEY ("templateId","geoId")
);

-- CreateTable
CREATE TABLE "Landing" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "geoId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" "LandingStatus" NOT NULL DEFAULT 'DRAFT',
    "previewUrl" TEXT,
    "publishedUrl" TEXT,
    "customDomain" TEXT,
    "currentVersionId" TEXT,
    "ownerId" TEXT NOT NULL,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockExpires" TIMESTAMP(3),
    "pixels" JSONB,
    "postbacks" JSONB,
    "seoMeta" JSONB,
    "settings" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "versionNum" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'MANUAL',
    "grapesJson" JSONB NOT NULL,
    "placeholders" JSONB NOT NULL,
    "html" TEXT,
    "css" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "snapshotS3Key" TEXT,
    "snapshotSize" INTEGER,
    "authorId" TEXT NOT NULL,
    "message" TEXT,
    "parentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "versionId" TEXT,
    "target" "PublishTarget" NOT NULL DEFAULT 'CLOUDFLARE_PAGES',
    "status" "PublishJobStatus" NOT NULL DEFAULT 'QUEUED',
    "triggeredById" TEXT NOT NULL,
    "logs" TEXT,
    "error" TEXT,
    "resultUrl" TEXT,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WidgetType" NOT NULL DEFAULT 'VANILLA_JS',
    "status" "WidgetStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT,
    "thumbnailUrl" TEXT,
    "previewUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetVersion" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "bundleUrl" TEXT NOT NULL,
    "bundleHash" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "changelog" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "landingId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "url" TEXT,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "hash" TEXT,
    "folder" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyLanding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "source" "LegacySource" NOT NULL DEFAULT 'UPLOAD',
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "fileTree" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geoHint" TEXT,
    "categoryHint" TEXT,
    "importedAsId" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyLanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyFile" (
    "id" TEXT NOT NULL,
    "legacyLandingId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "hash" TEXT,
    "isBinary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "anchor" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "Geo_code_key" ON "Geo"("code");

-- CreateIndex
CREATE INDEX "Geo_isActive_sortOrder_idx" ON "Geo"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Geo_language_idx" ON "Geo"("language");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_slug_key" ON "Variant"("slug");

-- CreateIndex
CREATE INDEX "Variant_isActive_sortOrder_idx" ON "Variant"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_categoryId_idx" ON "Template"("categoryId");

-- CreateIndex
CREATE INDEX "Template_isActive_isPublic_idx" ON "Template"("isActive", "isPublic");

-- CreateIndex
CREATE INDEX "Template_slug_idx" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "TemplateGeo_geoId_idx" ON "TemplateGeo"("geoId");

-- CreateIndex
CREATE UNIQUE INDEX "Landing_publicId_key" ON "Landing"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Landing_currentVersionId_key" ON "Landing"("currentVersionId");

-- CreateIndex
CREATE INDEX "Landing_status_deletedAt_idx" ON "Landing"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Landing_geoId_categoryId_variantId_idx" ON "Landing"("geoId", "categoryId", "variantId");

-- CreateIndex
CREATE INDEX "Landing_ownerId_idx" ON "Landing"("ownerId");

-- CreateIndex
CREATE INDEX "Landing_templateId_idx" ON "Landing"("templateId");

-- CreateIndex
CREATE INDEX "Landing_createdAt_idx" ON "Landing"("createdAt");

-- CreateIndex
CREATE INDEX "Landing_updatedAt_idx" ON "Landing"("updatedAt");

-- CreateIndex
CREATE INDEX "Landing_tags_idx" ON "Landing"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "Landing_geoId_slug_key" ON "Landing"("geoId", "slug");

-- CreateIndex
CREATE INDEX "Version_landingId_createdAt_idx" ON "Version"("landingId", "createdAt");

-- CreateIndex
CREATE INDEX "Version_authorId_idx" ON "Version"("authorId");

-- CreateIndex
CREATE INDEX "Version_status_idx" ON "Version"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Version_landingId_versionNum_key" ON "Version"("landingId", "versionNum");

-- CreateIndex
CREATE INDEX "PublishJob_landingId_createdAt_idx" ON "PublishJob"("landingId", "createdAt");

-- CreateIndex
CREATE INDEX "PublishJob_status_idx" ON "PublishJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_slug_key" ON "Widget"("slug");

-- CreateIndex
CREATE INDEX "Widget_status_deletedAt_idx" ON "Widget"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Widget_category_idx" ON "Widget"("category");

-- CreateIndex
CREATE INDEX "WidgetVersion_widgetId_isLatest_idx" ON "WidgetVersion"("widgetId", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetVersion_widgetId_version_key" ON "WidgetVersion"("widgetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_s3Key_key" ON "Asset"("s3Key");

-- CreateIndex
CREATE INDEX "Asset_landingId_idx" ON "Asset"("landingId");

-- CreateIndex
CREATE INDEX "Asset_uploaderId_idx" ON "Asset"("uploaderId");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_hash_idx" ON "Asset"("hash");

-- CreateIndex
CREATE INDEX "Asset_folder_idx" ON "Asset"("folder");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyLanding_path_key" ON "LegacyLanding"("path");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyLanding_importedAsId_key" ON "LegacyLanding"("importedAsId");

-- CreateIndex
CREATE INDEX "LegacyLanding_source_idx" ON "LegacyLanding"("source");

-- CreateIndex
CREATE INDEX "LegacyLanding_geoHint_idx" ON "LegacyLanding"("geoHint");

-- CreateIndex
CREATE INDEX "LegacyLanding_importedAsId_idx" ON "LegacyLanding"("importedAsId");

-- CreateIndex
CREATE INDEX "LegacyFile_legacyLandingId_idx" ON "LegacyFile"("legacyLandingId");

-- CreateIndex
CREATE INDEX "LegacyFile_hash_idx" ON "LegacyFile"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyFile_legacyLandingId_path_key" ON "LegacyFile"("legacyLandingId", "path");

-- CreateIndex
CREATE INDEX "Comment_landingId_idx" ON "Comment"("landingId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateGeo" ADD CONSTRAINT "TemplateGeo_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateGeo" ADD CONSTRAINT "TemplateGeo_geoId_fkey" FOREIGN KEY ("geoId") REFERENCES "Geo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_geoId_fkey" FOREIGN KEY ("geoId") REFERENCES "Geo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetVersion" ADD CONSTRAINT "WidgetVersion_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyLanding" ADD CONSTRAINT "LegacyLanding_importedAsId_fkey" FOREIGN KEY ("importedAsId") REFERENCES "Landing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyFile" ADD CONSTRAINT "LegacyFile_legacyLandingId_fkey" FOREIGN KEY ("legacyLandingId") REFERENCES "LegacyLanding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CustomIndex
CREATE INDEX "Landing_fts_idx" ON "Landing"
USING GIN (to_tsvector('simple', "name" || ' ' || coalesce("notes", '')));

-- CustomIndex
CREATE INDEX "Landing_name_trgm_idx" ON "Landing" USING GIN ("name" gin_trgm_ops);

-- CustomIndex
CREATE INDEX "Template_name_trgm_idx" ON "Template" USING GIN ("name" gin_trgm_ops);

-- CustomIndex
CREATE INDEX "Landing_active_idx" ON "Landing" ("updatedAt" DESC)
WHERE "deletedAt" IS NULL;
