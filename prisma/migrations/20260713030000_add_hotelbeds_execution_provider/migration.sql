-- Hotelbeds Execution Capability — the second SupplierExecutionProvider
-- implementation, proving Duffel was the first adapter, never the
-- architecture. See PROJECT.md.

-- AlterEnum
ALTER TYPE "SupplierOrderProvider" ADD VALUE 'HOTELBEDS';

-- AlterEnum
-- Generic async-confirmation state (Hotelbeds "ON REQUEST"/"PENDING"
-- bookings) — modeled, not auto-resolved, the same precedent AWAITING_PAYMENT
-- already established for Duffel.
ALTER TYPE "SupplierOrderStatus" ADD VALUE 'AWAITING_SUPPLIER_CONFIRMATION';
