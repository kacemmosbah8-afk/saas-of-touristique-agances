-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingRequestProductType" AS ENUM ('PACKAGE', 'HOTEL', 'DESTINATION', 'ACTIVITY', 'FLIGHT');

-- CreateEnum
CREATE TYPE "BookingRequestActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'CONTACTED', 'NOTE_ADDED', 'CONVERTED');

-- CreateTable
CREATE TABLE "booking_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "preferredDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "productType" "BookingRequestProductType" NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "contactedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "customerId" TEXT,
    "convertedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_request_activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "BookingRequestActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_request_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_requests_convertedBookingId_key" ON "booking_requests"("convertedBookingId");

-- CreateIndex
CREATE INDEX "booking_requests_tenantId_idx" ON "booking_requests"("tenantId");

-- CreateIndex
CREATE INDEX "booking_requests_tenantId_status_idx" ON "booking_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "booking_requests_tenantId_productType_productId_idx" ON "booking_requests"("tenantId", "productType", "productId");

-- CreateIndex
CREATE INDEX "booking_requests_customerId_idx" ON "booking_requests"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_requests_tenantId_reference_key" ON "booking_requests"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "booking_request_activities_tenantId_idx" ON "booking_request_activities"("tenantId");

-- CreateIndex
CREATE INDEX "booking_request_activities_bookingRequestId_createdAt_idx" ON "booking_request_activities"("bookingRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_convertedBookingId_fkey" FOREIGN KEY ("convertedBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_request_activities" ADD CONSTRAINT "booking_request_activities_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
