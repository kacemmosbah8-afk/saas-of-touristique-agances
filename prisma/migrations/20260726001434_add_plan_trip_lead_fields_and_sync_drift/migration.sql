-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'PLAN_MY_TRIP';

-- AlterEnum
BEGIN;
CREATE TYPE "ProviderType_new" AS ENUM ('AMADEUS', 'HOTELBEDS', 'BOOKING', 'EXPEDIA', 'TRAVELPORT', 'SABRE', 'GOGLOBAL', 'TBO', 'JUNIPER', 'TRAVELPAYOUTS');
ALTER TABLE "hotels" ALTER COLUMN "source" TYPE "ProviderType_new" USING ("source"::text::"ProviderType_new");
ALTER TABLE "destinations" ALTER COLUMN "source" TYPE "ProviderType_new" USING ("source"::text::"ProviderType_new");
ALTER TABLE "providers" ALTER COLUMN "type" TYPE "ProviderType_new" USING ("type"::text::"ProviderType_new");
ALTER TYPE "ProviderType" RENAME TO "ProviderType_old";
ALTER TYPE "ProviderType_new" RENAME TO "ProviderType";
DROP TYPE "public"."ProviderType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "supplier_order_events" DROP CONSTRAINT "supplier_order_events_supplierOrderId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_order_events" DROP CONSTRAINT "supplier_order_events_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_orders" DROP CONSTRAINT "supplier_orders_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_orders" DROP CONSTRAINT "supplier_orders_bookingItemId_fkey";

-- DropForeignKey
ALTER TABLE "supplier_orders" DROP CONSTRAINT "supplier_orders_tenantId_fkey";

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "includedItemsFr" DROP DEFAULT,
ALTER COLUMN "excludedItemsFr" DROP DEFAULT;

-- AlterTable
ALTER TABLE "destinations" ALTER COLUMN "popularAttractionsFr" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hotels" ALTER COLUMN "amenitiesFr" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "tripDestination" TEXT,
ADD COLUMN     "tripPeriod" TEXT,
ADD COLUMN     "tripStyle" TEXT,
ADD COLUMN     "tripTravelers" INTEGER;

-- AlterTable
ALTER TABLE "packages" ALTER COLUMN "highlightsFr" DROP DEFAULT,
ALTER COLUMN "includedServicesFr" DROP DEFAULT,
ALTER COLUMN "excludedServicesFr" DROP DEFAULT,
ALTER COLUMN "importantNotesFr" DROP DEFAULT,
ALTER COLUMN "whatToBringFr" DROP DEFAULT;

-- DropTable
DROP TABLE "supplier_order_events";

-- DropTable
DROP TABLE "supplier_orders";

-- DropEnum
DROP TYPE "SupplierCommitMode";

-- DropEnum
DROP TYPE "SupplierOrderEventType";

-- DropEnum
DROP TYPE "SupplierOrderProvider";

-- DropEnum
DROP TYPE "SupplierOrderStatus";

