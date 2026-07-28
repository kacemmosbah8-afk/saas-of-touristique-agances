-- CreateTable
CREATE TABLE "flights" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "shortDescription" TEXT,
    "description" TEXT,
    "airline" TEXT,
    "airlineLogoUrl" TEXT,
    "flightNumber" TEXT,
    "departureCity" TEXT,
    "departureAirport" TEXT,
    "departureCountry" TEXT,
    "arrivalCity" TEXT,
    "arrivalAirport" TEXT,
    "arrivalCountry" TEXT,
    "departureTime" TEXT,
    "arrivalTime" TEXT,
    "durationMinutes" INTEGER,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "cabinClass" TEXT,
    "basePrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coverImageKey" TEXT,
    "coverImageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "fileKey" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flights_tenantId_idx" ON "flights"("tenantId");

-- CreateIndex
CREATE INDEX "flights_tenantId_status_idx" ON "flights"("tenantId", "status");

-- CreateIndex
CREATE INDEX "flights_tenantId_departureCity_arrivalCity_idx" ON "flights"("tenantId", "departureCity", "arrivalCity");

-- CreateIndex
CREATE UNIQUE INDEX "flights_tenantId_slug_key" ON "flights"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "flight_images_tenantId_idx" ON "flight_images"("tenantId");

-- CreateIndex
CREATE INDEX "flight_images_flightId_position_idx" ON "flight_images"("flightId", "position");

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_images" ADD CONSTRAINT "flight_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_images" ADD CONSTRAINT "flight_images_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
