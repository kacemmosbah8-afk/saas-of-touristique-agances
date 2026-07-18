-- DropForeignKey
ALTER TABLE "billing_accounts" DROP CONSTRAINT "billing_accounts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "subscription_events" DROP CONSTRAINT "subscription_events_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "subscription_events" DROP CONSTRAINT "subscription_events_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_billingAccountId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_tenantId_fkey";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "plan",
DROP COLUMN "status";

-- DropTable
DROP TABLE "billing_accounts";

-- DropTable
DROP TABLE "plans";

-- DropTable
DROP TABLE "subscription_events";

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "BillingInterval";

-- DropEnum
DROP TYPE "BillingProvider";

-- DropEnum
DROP TYPE "SubscriptionEventType";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "TenantPlan";

-- DropEnum
DROP TYPE "TenantStatus";

