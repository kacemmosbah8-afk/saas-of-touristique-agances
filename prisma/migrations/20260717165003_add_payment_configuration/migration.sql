-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BALANCE', 'CARD', 'ARC_BSP_CASH');

-- CreateTable
CREATE TABLE "payment_configurations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "methodType" "PaymentMethodType" NOT NULL DEFAULT 'BALANCE',
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_configurations_tenantId_idx" ON "payment_configurations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_configurations_tenantId_provider_key" ON "payment_configurations"("tenantId", "provider");

-- AddForeignKey
ALTER TABLE "payment_configurations" ADD CONSTRAINT "payment_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
