-- CreateEnum
CREATE TYPE "VisaRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'DOCUMENTS_REQUESTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisaRequestActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "visa_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "travelStartDate" TIMESTAMP(3),
    "travelEndDate" TIMESTAMP(3),
    "travelerCount" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "status" "VisaRequestStatus" NOT NULL DEFAULT 'PENDING',
    "contactedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "customerId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_request_travellers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visaRequestId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportIssuingCountry" TEXT NOT NULL,
    "passportIssueDate" TIMESTAMP(3),
    "passportExpiry" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_request_travellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_request_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visaRequestId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_request_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_request_activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visaRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "VisaRequestActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_request_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visa_requests_tenantId_idx" ON "visa_requests"("tenantId");

-- CreateIndex
CREATE INDEX "visa_requests_tenantId_status_idx" ON "visa_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "visa_requests_customerId_idx" ON "visa_requests"("customerId");

-- CreateIndex
CREATE INDEX "visa_requests_bookingId_idx" ON "visa_requests"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_requests_tenantId_reference_key" ON "visa_requests"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "visa_request_travellers_tenantId_idx" ON "visa_request_travellers"("tenantId");

-- CreateIndex
CREATE INDEX "visa_request_travellers_visaRequestId_idx" ON "visa_request_travellers"("visaRequestId");

-- CreateIndex
CREATE INDEX "visa_request_documents_tenantId_idx" ON "visa_request_documents"("tenantId");

-- CreateIndex
CREATE INDEX "visa_request_documents_visaRequestId_idx" ON "visa_request_documents"("visaRequestId");

-- CreateIndex
CREATE INDEX "visa_request_activities_tenantId_idx" ON "visa_request_activities"("tenantId");

-- CreateIndex
CREATE INDEX "visa_request_activities_visaRequestId_createdAt_idx" ON "visa_request_activities"("visaRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_requests" ADD CONSTRAINT "visa_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_request_travellers" ADD CONSTRAINT "visa_request_travellers_visaRequestId_fkey" FOREIGN KEY ("visaRequestId") REFERENCES "visa_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_request_documents" ADD CONSTRAINT "visa_request_documents_visaRequestId_fkey" FOREIGN KEY ("visaRequestId") REFERENCES "visa_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_request_activities" ADD CONSTRAINT "visa_request_activities_visaRequestId_fkey" FOREIGN KEY ("visaRequestId") REFERENCES "visa_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
