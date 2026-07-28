-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_companyId_fkey";

-- DropForeignKey
ALTER TABLE "airlines" DROP CONSTRAINT "airlines_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "airports" DROP CONSTRAINT "airports_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "cities" DROP CONSTRAINT "cities_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_companyId_fkey";

-- DropForeignKey
ALTER TABLE "countries" DROP CONSTRAINT "countries_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_companyId_fkey";

-- DropIndex
DROP INDEX "addresses_companyId_idx";

-- DropIndex
DROP INDEX "contacts_companyId_idx";

-- DropIndex
DROP INDEX "customers_companyId_idx";

-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "supplier_confirmations" ADD COLUMN     "supplierId" TEXT;

-- DropTable
DROP TABLE "airlines";

-- DropTable
DROP TABLE "airports";

-- DropTable
DROP TABLE "amenities";

-- DropTable
DROP TABLE "cities";

-- DropTable
DROP TABLE "companies";

-- DropTable
DROP TABLE "countries";

-- CreateIndex
CREATE INDEX "supplier_confirmations_supplierId_idx" ON "supplier_confirmations"("supplierId");

-- AddForeignKey
ALTER TABLE "supplier_confirmations" ADD CONSTRAINT "supplier_confirmations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
