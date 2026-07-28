-- CreateEnum
CREATE TYPE "SupplierCommitMode" AS ENUM ('HOLD', 'IMMEDIATE');

-- AlterTable
ALTER TABLE "supplier_orders" ADD COLUMN     "commitMode" "SupplierCommitMode" NOT NULL DEFAULT 'HOLD';

