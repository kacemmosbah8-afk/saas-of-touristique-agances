-- AlterTable
ALTER TABLE "booking_items" ADD COLUMN     "supplierCost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "pricingSettings" JSONB;
