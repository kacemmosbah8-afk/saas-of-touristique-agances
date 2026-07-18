-- AlterEnum
BEGIN;
CREATE TYPE "DocumentCategory_new" AS ENUM ('IMAGE', 'PDF', 'PASSPORT', 'VISA', 'CONTRACT', 'INSURANCE', 'NATIONAL_ID', 'VACCINATION', 'OTHER');
ALTER TABLE "public"."documents" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "category" TYPE "DocumentCategory_new" USING ("category"::text::"DocumentCategory_new");
ALTER TYPE "DocumentCategory" RENAME TO "DocumentCategory_old";
ALTER TYPE "DocumentCategory_new" RENAME TO "DocumentCategory";
DROP TYPE "public"."DocumentCategory_old";
ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SupplierOrderStatus_new" AS ENUM ('PENDING', 'EXECUTING', 'SUPPLIER_CONFIRMED', 'SUPPLIER_FAILED', 'AWAITING_SUPPLIER_SETTLEMENT', 'AWAITING_SUPPLIER_CONFIRMATION', 'CANCELLED', 'RECONCILIATION_REQUIRED');
ALTER TABLE "public"."supplier_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "supplier_orders" ALTER COLUMN "status" TYPE "SupplierOrderStatus_new" USING ("status"::text::"SupplierOrderStatus_new");
ALTER TYPE "SupplierOrderStatus" RENAME TO "SupplierOrderStatus_old";
ALTER TYPE "SupplierOrderStatus_new" RENAME TO "SupplierOrderStatus";
DROP TYPE "public"."SupplierOrderStatus_old";
ALTER TABLE "supplier_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "booking_cancellations" DROP CONSTRAINT "booking_cancellations_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_cancellations" DROP CONSTRAINT "booking_cancellations_policyId_fkey";

-- DropForeignKey
ALTER TABLE "booking_cancellations" DROP CONSTRAINT "booking_cancellations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_cancellationPolicyId_fkey";

-- DropForeignKey
ALTER TABLE "cancellation_policies" DROP CONSTRAINT "cancellation_policies_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "cancellation_policy_rules" DROP CONSTRAINT "cancellation_policy_rules_policyId_fkey";

-- DropForeignKey
ALTER TABLE "cancellation_policy_rules" DROP CONSTRAINT "cancellation_policy_rules_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "installment_plans" DROP CONSTRAINT "installment_plans_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "installment_plans" DROP CONSTRAINT "installment_plans_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "installments" DROP CONSTRAINT "installments_planId_fkey";

-- DropForeignKey
ALTER TABLE "installments" DROP CONSTRAINT "installments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_activities" DROP CONSTRAINT "invoice_activities_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_activities" DROP CONSTRAINT "invoice_activities_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customerId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "payment_activities" DROP CONSTRAINT "payment_activities_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "payment_activities" DROP CONSTRAINT "payment_activities_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "payment_configurations" DROP CONSTRAINT "payment_configurations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_installmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenantId_fkey";

-- AlterTable
ALTER TABLE "booking_items" DROP COLUMN "supplierCost";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "cancellationPolicyId";

-- AlterTable
ALTER TABLE "supplier_orders" DROP COLUMN "paidOverride",
DROP COLUMN "paymentMode";

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "commissionNotes",
DROP COLUMN "commissionRate",
DROP COLUMN "paymentTerms";

-- AlterTable
ALTER TABLE "tenant_settings" DROP COLUMN "pricingSettings";

-- DropTable
DROP TABLE "booking_cancellations";

-- DropTable
DROP TABLE "cancellation_policies";

-- DropTable
DROP TABLE "cancellation_policy_rules";

-- DropTable
DROP TABLE "credit_notes";

-- DropTable
DROP TABLE "installment_plans";

-- DropTable
DROP TABLE "installments";

-- DropTable
DROP TABLE "invoice_activities";

-- DropTable
DROP TABLE "invoice_items";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "payment_activities";

-- DropTable
DROP TABLE "payment_configurations";

-- DropTable
DROP TABLE "payment_transactions";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "CancellationPenaltyType";

-- DropEnum
DROP TYPE "CreditNoteStatus";

-- DropEnum
DROP TYPE "InstallmentStatus";

-- DropEnum
DROP TYPE "InvoiceActivityType";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PaymentActivityType";

-- DropEnum
DROP TYPE "PaymentKind";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentMethodType";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PaymentTransactionType";

-- DropEnum
DROP TYPE "SupplierPaymentMode";

