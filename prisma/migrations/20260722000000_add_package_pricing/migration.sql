-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "internalCost" DECIMAL(12,2),
ADD COLUMN     "sellingPrice" DECIMAL(12,2);
