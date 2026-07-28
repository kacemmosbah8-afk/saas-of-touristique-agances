-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HotelCategory" AS ENUM ('BUDGET', 'STANDARD', 'BOUTIQUE', 'LUXURY', 'RESORT', 'RIAD', 'GUESTHOUSE', 'HOSTEL');

-- CreateEnum
CREATE TYPE "RoomTypeKind" AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'FAMILY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('AIRPORT_TRANSFER', 'BUS', 'PRIVATE', 'CAR_RENTAL', 'BOAT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('HOTEL', 'TRANSPORT', 'ACTIVITY', 'RESTAURANT', 'GUIDE', 'VISA', 'INSURANCE', 'OTHER');

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HotelCategory" NOT NULL DEFAULT 'STANDARD',
    "stars" INTEGER,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "amenities" TEXT[],
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "internalNotes" TEXT,
    "coverImageKey" TEXT,
    "coverImageUrl" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "kind" "RoomTypeKind" NOT NULL DEFAULT 'STANDARD',
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "beds" INTEGER,
    "occupancy" INTEGER,
    "basePrice" DECIMAL(12,2),
    "internalCost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "images" TEXT[],
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_providers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransportType" NOT NULL DEFAULT 'PRIVATE',
    "country" TEXT,
    "city" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "fleetNotes" TEXT,
    "pricingNotes" TEXT,
    "internalNotes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transport_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "languages" TEXT[],
    "certifications" TEXT[],
    "experienceYears" INTEGER,
    "dailyRate" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "country" TEXT,
    "city" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "availabilityNotes" TEXT,
    "internalNotes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'OTHER',
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "paymentTerms" TEXT,
    "internalRating" INTEGER,
    "notes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'document',
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "durationMinutes" INTEGER,
    "meetingPoint" TEXT,
    "description" TEXT,
    "includedItems" TEXT[],
    "excludedItems" TEXT[],
    "country" TEXT,
    "city" TEXT,
    "supplierId" TEXT,
    "internalCost" DECIMAL(12,2),
    "sellingPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coverImageKey" TEXT,
    "coverImageUrl" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "description" TEXT,
    "heroImageKey" TEXT,
    "heroImageUrl" TEXT,
    "popularAttractions" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_hotels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_guides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_transport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "transportProviderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotels_tenantId_idx" ON "hotels"("tenantId");

-- CreateIndex
CREATE INDEX "hotels_tenantId_status_idx" ON "hotels"("tenantId", "status");

-- CreateIndex
CREATE INDEX "hotels_tenantId_country_city_idx" ON "hotels"("tenantId", "country", "city");

-- CreateIndex
CREATE INDEX "hotel_images_tenantId_idx" ON "hotel_images"("tenantId");

-- CreateIndex
CREATE INDEX "hotel_images_hotelId_position_idx" ON "hotel_images"("hotelId", "position");

-- CreateIndex
CREATE INDEX "room_types_tenantId_idx" ON "room_types"("tenantId");

-- CreateIndex
CREATE INDEX "room_types_hotelId_position_idx" ON "room_types"("hotelId", "position");

-- CreateIndex
CREATE INDEX "transport_providers_tenantId_idx" ON "transport_providers"("tenantId");

-- CreateIndex
CREATE INDEX "transport_providers_tenantId_status_idx" ON "transport_providers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "transport_providers_tenantId_type_idx" ON "transport_providers"("tenantId", "type");

-- CreateIndex
CREATE INDEX "guides_tenantId_idx" ON "guides"("tenantId");

-- CreateIndex
CREATE INDEX "guides_tenantId_status_idx" ON "guides"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_idx" ON "suppliers"("tenantId");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_status_idx" ON "suppliers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_type_idx" ON "suppliers"("tenantId", "type");

-- CreateIndex
CREATE INDEX "supplier_documents_tenantId_idx" ON "supplier_documents"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_documents_supplierId_idx" ON "supplier_documents"("supplierId");

-- CreateIndex
CREATE INDEX "activities_tenantId_idx" ON "activities"("tenantId");

-- CreateIndex
CREATE INDEX "activities_tenantId_status_idx" ON "activities"("tenantId", "status");

-- CreateIndex
CREATE INDEX "activities_supplierId_idx" ON "activities"("supplierId");

-- CreateIndex
CREATE INDEX "activity_images_tenantId_idx" ON "activity_images"("tenantId");

-- CreateIndex
CREATE INDEX "activity_images_activityId_position_idx" ON "activity_images"("activityId", "position");

-- CreateIndex
CREATE INDEX "destinations_tenantId_idx" ON "destinations"("tenantId");

-- CreateIndex
CREATE INDEX "destinations_tenantId_status_idx" ON "destinations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "destinations_tenantId_country_idx" ON "destinations"("tenantId", "country");

-- CreateIndex
CREATE INDEX "destination_images_tenantId_idx" ON "destination_images"("tenantId");

-- CreateIndex
CREATE INDEX "destination_images_destinationId_position_idx" ON "destination_images"("destinationId", "position");

-- CreateIndex
CREATE INDEX "package_hotels_tenantId_idx" ON "package_hotels"("tenantId");

-- CreateIndex
CREATE INDEX "package_hotels_packageId_position_idx" ON "package_hotels"("packageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "package_hotels_packageId_hotelId_key" ON "package_hotels"("packageId", "hotelId");

-- CreateIndex
CREATE INDEX "package_activities_tenantId_idx" ON "package_activities"("tenantId");

-- CreateIndex
CREATE INDEX "package_activities_packageId_position_idx" ON "package_activities"("packageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "package_activities_packageId_activityId_key" ON "package_activities"("packageId", "activityId");

-- CreateIndex
CREATE INDEX "package_guides_tenantId_idx" ON "package_guides"("tenantId");

-- CreateIndex
CREATE INDEX "package_guides_packageId_position_idx" ON "package_guides"("packageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "package_guides_packageId_guideId_key" ON "package_guides"("packageId", "guideId");

-- CreateIndex
CREATE INDEX "package_transport_tenantId_idx" ON "package_transport"("tenantId");

-- CreateIndex
CREATE INDEX "package_transport_packageId_position_idx" ON "package_transport"("packageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "package_transport_packageId_transportProviderId_key" ON "package_transport"("packageId", "transportProviderId");

-- CreateIndex
CREATE INDEX "package_suppliers_tenantId_idx" ON "package_suppliers"("tenantId");

-- CreateIndex
CREATE INDEX "package_suppliers_packageId_position_idx" ON "package_suppliers"("packageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "package_suppliers_packageId_supplierId_key" ON "package_suppliers"("packageId", "supplierId");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_providers" ADD CONSTRAINT "transport_providers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_images" ADD CONSTRAINT "activity_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_images" ADD CONSTRAINT "activity_images_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_hotels" ADD CONSTRAINT "package_hotels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_hotels" ADD CONSTRAINT "package_hotels_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_hotels" ADD CONSTRAINT "package_hotels_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_activities" ADD CONSTRAINT "package_activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_activities" ADD CONSTRAINT "package_activities_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_activities" ADD CONSTRAINT "package_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_guides" ADD CONSTRAINT "package_guides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_guides" ADD CONSTRAINT "package_guides_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_guides" ADD CONSTRAINT "package_guides_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_transport" ADD CONSTRAINT "package_transport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_transport" ADD CONSTRAINT "package_transport_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_transport" ADD CONSTRAINT "package_transport_transportProviderId_fkey" FOREIGN KEY ("transportProviderId") REFERENCES "transport_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_suppliers" ADD CONSTRAINT "package_suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_suppliers" ADD CONSTRAINT "package_suppliers_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_suppliers" ADD CONSTRAINT "package_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
