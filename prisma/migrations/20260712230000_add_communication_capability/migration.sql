-- Communication Capability — a single, polymorphic delivery record for every
-- outbound message, on every channel, from every feature. See PROJECT.md,
-- "Sprint — Complete the Communication Capability".

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL',
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" "CommunicationStatus" NOT NULL,
    "failureReason" TEXT,
    "providerMessageId" TEXT,
    "sentByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communication_messages_tenantId_idx" ON "communication_messages"("tenantId");

-- CreateIndex
CREATE INDEX "communication_messages_ownerType_ownerId_idx" ON "communication_messages"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "communication_messages_tenantId_createdAt_idx" ON "communication_messages"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
