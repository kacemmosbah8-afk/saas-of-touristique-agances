import { unstable_cache } from "next/cache";

import { getTenantDb } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { listDestinations } from "@/features/destinations/queries/list-destinations.query";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { listPackages } from "@/features/packages/queries/list-packages.query";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { listHotels } from "@/features/hotels/queries/list-hotels.query";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { listFlights } from "@/features/flights/queries/list-flights.query";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import { listActivities } from "@/features/activities/queries/list-activities.query";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { getItinerary } from "@/features/itinerary/queries/get-itinerary.query";
import type { ListDestinationsFilters } from "@/features/destinations/schemas/destination.schema";
import type { ListPackagesFilters } from "@/features/packages/schemas/package.schema";
import type { ListHotelsFilters } from "@/features/hotels/schemas/hotel.schema";
import type { ListFlightsFilters } from "@/features/flights/schemas/flight.schema";
import type { ListActivitiesFilters } from "@/features/activities/schemas/activity.schema";

/**
 * Cached read path for the public storefront only — admin pages must keep
 * calling the raw queries in `@/features/*​/queries` directly so an agency
 * staffer sees their own edits immediately. Anonymous storefront visitors
 * tolerate up to a minute of staleness, which is what buys the speed here:
 * catalog data barely changes, but every uncached visit was a fresh
 * Postgres round trip.
 *
 * Each wrapper takes plain, serializable arguments (`tenantId` instead of
 * a `TenantDb` instance) because `unstable_cache` derives its cache key by
 * hashing the arguments — a `TenantDb` is a Prisma extension proxy full of
 * functions, not serializable, so it can never be a cached function's
 * argument. The tenant-scoped client is constructed *inside* the wrapper
 * instead.
 */
const REVALIDATE_SECONDS = 60;

export const getCachedAgencyProfile = unstable_cache(getAgencyProfile, ["public-agency-profile"], {
  revalidate: REVALIDATE_SECONDS,
});

export const listPublicDestinations = unstable_cache(
  (tenantId: string, filters: ListDestinationsFilters = {}) =>
    listDestinations(getTenantDb(tenantId), filters),
  ["public-list-destinations"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicDestinationBySlug = unstable_cache(
  (tenantId: string, slug: string) => getDestinationBySlug(getTenantDb(tenantId), slug),
  ["public-destination-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

export const listPublicPackages = unstable_cache(
  (tenantId: string, filters: ListPackagesFilters = {}) => listPackages(getTenantDb(tenantId), filters),
  ["public-list-packages"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicPackageBySlug = unstable_cache(
  (tenantId: string, slug: string) => getPackageBySlug(getTenantDb(tenantId), slug),
  ["public-package-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicItinerary = unstable_cache(
  (tenantId: string, packageId: string) => getItinerary(getTenantDb(tenantId), packageId),
  ["public-itinerary"],
  { revalidate: REVALIDATE_SECONDS },
);

export const listPublicHotels = unstable_cache(
  (tenantId: string, filters: ListHotelsFilters = {}) => listHotels(getTenantDb(tenantId), filters),
  ["public-list-hotels"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicHotelBySlug = unstable_cache(
  (tenantId: string, slug: string) => getHotelBySlug(getTenantDb(tenantId), slug),
  ["public-hotel-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

export const listPublicFlights = unstable_cache(
  (tenantId: string, filters: ListFlightsFilters = {}) => listFlights(getTenantDb(tenantId), filters),
  ["public-list-flights"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicFlightBySlug = unstable_cache(
  (tenantId: string, slug: string) => getFlightBySlug(getTenantDb(tenantId), slug),
  ["public-flight-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

export const listPublicActivities = unstable_cache(
  (tenantId: string, filters: ListActivitiesFilters = {}) =>
    listActivities(getTenantDb(tenantId), filters),
  ["public-list-activities"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPublicActivityBySlug = unstable_cache(
  (tenantId: string, slug: string) => getActivityBySlug(getTenantDb(tenantId), slug),
  ["public-activity-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);
