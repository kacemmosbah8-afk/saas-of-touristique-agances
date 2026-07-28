-- CreateEnum
CREATE TYPE "PackageDifficulty" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING', 'EXTREME');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "coverImageKey" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "difficulty" "PackageDifficulty",
ADD COLUMN     "durationNights" INTEGER,
ADD COLUMN     "excludedServices" TEXT[],
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highlights" TEXT[],
ADD COLUMN     "importantNotes" TEXT[],
ADD COLUMN     "includedServices" TEXT[],
ADD COLUMN     "meetingPoint" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "whatToBring" TEXT[];

-- CreateTable
CREATE TABLE "package_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "package_images_tenantId_idx" ON "package_images"("tenantId");

-- CreateIndex
CREATE INDEX "package_images_packageId_position_idx" ON "package_images"("packageId", "position");

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
