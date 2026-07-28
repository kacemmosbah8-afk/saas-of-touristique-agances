-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'TRAVELPAYOUTS';

-- AlterTable
ALTER TABLE "hotel_images" ALTER COLUMN "fileKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "destination_images" ALTER COLUMN "fileKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "source" "ProviderType",
ADD COLUMN     "externalCode" TEXT;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "contentSyncSettings" JSONB;

-- CreateIndex
CREATE INDEX "destinations_tenantId_source_externalCode_idx" ON "destinations"("tenantId", "source", "externalCode");
