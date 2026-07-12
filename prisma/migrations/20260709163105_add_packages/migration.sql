-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "duration" INTEGER,
    "destination" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packages_tenantId_idx" ON "packages"("tenantId");

-- CreateIndex
CREATE INDEX "packages_tenantId_status_idx" ON "packages"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "packages_tenantId_slug_key" ON "packages"("tenantId", "slug");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
