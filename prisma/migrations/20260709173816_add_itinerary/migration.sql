-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "mealBreakfast" TEXT,
    "mealLunch" TEXT,
    "mealDinner" TEXT,
    "transferNotes" TEXT,
    "accommodationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itinerary_days_tenantId_idx" ON "itinerary_days"("tenantId");

-- CreateIndex
CREATE INDEX "itinerary_days_packageId_dayNumber_idx" ON "itinerary_days"("packageId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_packageId_dayNumber_key" ON "itinerary_days"("packageId", "dayNumber");

-- CreateIndex
CREATE INDEX "itinerary_activities_tenantId_idx" ON "itinerary_activities"("tenantId");

-- CreateIndex
CREATE INDEX "itinerary_activities_dayId_position_idx" ON "itinerary_activities"("dayId", "position");

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_activities" ADD CONSTRAINT "itinerary_activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_activities" ADD CONSTRAINT "itinerary_activities_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
