-- AlterTable
ALTER TABLE "Landing" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "defaultImage" TEXT,
    "claimsKey" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "geoId" TEXT,
    "price" DECIMAL(12,4) NOT NULL,
    "oldPrice" DECIMAL(12,4),
    "currency" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "I18nString" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "context" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "I18nString_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_archivedAt_idx" ON "Product"("archivedAt");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Price_productId_geoId_validFrom_idx" ON "Price"("productId", "geoId", "validFrom");

-- CreateIndex
CREATE INDEX "Price_validFrom_idx" ON "Price"("validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Price_productId_geoId_validFrom_key" ON "Price"("productId", "geoId", "validFrom");

-- CreateIndex
CREATE INDEX "I18nString_lang_idx" ON "I18nString"("lang");

-- CreateIndex
CREATE INDEX "I18nString_key_idx" ON "I18nString"("key");

-- CreateIndex
CREATE INDEX "I18nString_isApproved_idx" ON "I18nString"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "I18nString_key_lang_key" ON "I18nString"("key", "lang");

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_geoId_fkey" FOREIGN KEY ("geoId") REFERENCES "Geo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
