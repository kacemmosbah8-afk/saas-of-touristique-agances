-- Adds the French ("Fr"-suffixed) sibling columns for every admin-authored
-- field a traveler reads on the public storefront. Arabic (the existing
-- bare columns) stays the source of truth and primary language; these are
-- purely additive and nullable/empty-array, so no existing data changes.
--
-- Scoped deliberately to only these columns — schema.prisma has separate,
-- pre-existing, unrelated drift (a ProviderType enum value) that is NOT
-- part of this migration and must be handled on its own.

-- packages
ALTER TABLE "packages"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "shortDescriptionFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "destinationFr" TEXT,
  ADD COLUMN "countryFr" TEXT,
  ADD COLUMN "categoryFr" TEXT,
  ADD COLUMN "highlightsFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "includedServicesFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "excludedServicesFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "importantNotesFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "whatToBringFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "cancellationPolicyFr" TEXT,
  ADD COLUMN "meetingPointFr" TEXT,
  ADD COLUMN "seoTitleFr" TEXT,
  ADD COLUMN "seoDescriptionFr" TEXT;

-- package_images
ALTER TABLE "package_images"
  ADD COLUMN "altFr" TEXT;

-- itinerary_days
ALTER TABLE "itinerary_days"
  ADD COLUMN "titleFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "notesFr" TEXT,
  ADD COLUMN "mealBreakfastFr" TEXT,
  ADD COLUMN "mealLunchFr" TEXT,
  ADD COLUMN "mealDinnerFr" TEXT,
  ADD COLUMN "transferNotesFr" TEXT,
  ADD COLUMN "accommodationNotesFr" TEXT;

-- itinerary_activities
ALTER TABLE "itinerary_activities"
  ADD COLUMN "titleFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT;

-- hotels
ALTER TABLE "hotels"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "countryFr" TEXT,
  ADD COLUMN "cityFr" TEXT,
  ADD COLUMN "addressFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "amenitiesFr" TEXT[] NOT NULL DEFAULT '{}';

-- hotel_images
ALTER TABLE "hotel_images"
  ADD COLUMN "altFr" TEXT;

-- room_types
ALTER TABLE "room_types"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "notesFr" TEXT;

-- activities
ALTER TABLE "activities"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "categoryFr" TEXT,
  ADD COLUMN "meetingPointFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "includedItemsFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "excludedItemsFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "countryFr" TEXT,
  ADD COLUMN "cityFr" TEXT;

-- activity_images
ALTER TABLE "activity_images"
  ADD COLUMN "altFr" TEXT;

-- destinations
ALTER TABLE "destinations"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "countryFr" TEXT,
  ADD COLUMN "regionFr" TEXT,
  ADD COLUMN "cityFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "popularAttractionsFr" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "seoTitleFr" TEXT,
  ADD COLUMN "seoDescriptionFr" TEXT;

-- destination_images
ALTER TABLE "destination_images"
  ADD COLUMN "altFr" TEXT;

-- flights
ALTER TABLE "flights"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "shortDescriptionFr" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "departureCityFr" TEXT,
  ADD COLUMN "departureAirportFr" TEXT,
  ADD COLUMN "departureCountryFr" TEXT,
  ADD COLUMN "arrivalCityFr" TEXT,
  ADD COLUMN "arrivalAirportFr" TEXT,
  ADD COLUMN "arrivalCountryFr" TEXT,
  ADD COLUMN "cabinClassFr" TEXT,
  ADD COLUMN "seoTitleFr" TEXT,
  ADD COLUMN "seoDescriptionFr" TEXT;

-- flight_images
ALTER TABLE "flight_images"
  ADD COLUMN "altFr" TEXT;
