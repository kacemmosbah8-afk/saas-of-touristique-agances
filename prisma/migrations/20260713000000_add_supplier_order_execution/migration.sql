-- Supplier Order Execution Capability — a generic engine turning a validated
-- booking line into a real, externally confirmed supplier order. Duffel is
-- the first provider implementation. See PROJECT.md.

-- CreateEnum
CREATE TYPE "SupplierOrderProvider" AS ENUM ('DUFFEL');

-- CreateEnum
CREATE TYPE "SupplierOrderStatus" AS ENUM ('PENDING', 'EXECUTING', 'SUPPLIER_CONFIRMED', 'SUPPLIER_FAILED', 'AWAITING_PAYMENT', 'CANCELLED', 'RECONCILIATION_REQUIRED');

-- CreateEnum
CREATE TYPE "SupplierPaymentMode" AS ENUM ('HOLD', 'BALANCE');

-- CreateEnum
CREATE TYPE "SupplierOrderEventType" AS ENUM ('REQUESTED', 'ATTEMPT_STARTED', 'SUPPLIER_CONFIRMED', 'SUPPLIER_FAILED', 'RETRY_REQUESTED', 'CANCELLED', 'RECONCILIATION_FLAGGED');

-- CreateTable
CREATE TABLE "supplier_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingItemId" TEXT NOT NULL,
    "provider" "SupplierOrderProvider" NOT NULL,
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "supplierOfferRef" TEXT NOT NULL,
    "supplierOrderId" TEXT,
    "confirmationNumber" TEXT,
    "paymentMode" "SupplierPaymentMode" NOT NULL DEFAULT 'HOLD',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "retryable" BOOLEAN,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "requestedBy" TEXT,
    "paidOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_order_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierOrderId" TEXT NOT NULL,
    "type" "SupplierOrderEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_order_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_orders_bookingItemId_key" ON "supplier_orders"("bookingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_orders_idempotencyKey_key" ON "supplier_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "supplier_orders_tenantId_idx" ON "supplier_orders"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_orders_bookingId_idx" ON "supplier_orders"("bookingId");

-- CreateIndex
CREATE INDEX "supplier_orders_tenantId_status_idx" ON "supplier_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_order_events_tenantId_idx" ON "supplier_order_events"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_order_events_supplierOrderId_idx" ON "supplier_order_events"("supplierOrderId");

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "booking_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_events" ADD CONSTRAINT "supplier_order_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_events" ADD CONSTRAINT "supplier_order_events_supplierOrderId_fkey" FOREIGN KEY ("supplierOrderId") REFERENCES "supplier_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
