import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const INTEGRATION_TYPE_VALUES = ["DUFFEL", "HOTELBEDS", "AMADEUS", "TRAVELPAYOUTS"] as const;

export const integrationTypeSchema = z.object({
  type: z.enum(INTEGRATION_TYPE_VALUES),
});
export type IntegrationTypeInput = z.infer<typeof integrationTypeSchema>;

export const toggleIntegrationSchema = z.object({
  type: z.enum(INTEGRATION_TYPE_VALUES),
  enabled: z.boolean(),
});
export type ToggleIntegrationInput = z.infer<typeof toggleIntegrationSchema>;

// -------------------------------------------- Per-tenant credential capture

const secret = (max = 500) => z.string().trim().min(1, "Required").max(max);

/**
 * Connection wizard input — one variant per provider. Secret values are
 * encrypted before storage and never returned to the client.
 */
export const connectProviderSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DUFFEL"),
    token: secret(),
  }),
  z.object({
    type: z.literal("HOTELBEDS"),
    apiKey: secret(),
    apiSecret: secret(),
    environment: z.enum(["test", "live"]),
  }),
  z.object({
    type: z.literal("AMADEUS"),
    clientId: secret(),
    clientSecret: secret(),
  }),
  z.object({
    type: z.literal("TRAVELPAYOUTS"),
    token: secret(),
  }),
]);
export type ConnectProviderInput = z.infer<typeof connectProviderSchema>;

// --------------------------------------------------------------- Flights

export const flightSearchSchema = z
  .object({
    origin: z.string().trim().length(3, "Use a 3-letter IATA code").toUpperCase(),
    destination: z.string().trim().length(3, "Use a 3-letter IATA code").toUpperCase(),
    departureDate: isoDate,
    returnDate: isoDate.optional().or(z.literal("")),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    infants: z.number().int().min(0).max(4),
  })
  .refine((d) => d.origin !== d.destination, {
    message: "Origin and destination must differ",
    path: ["destination"],
  });
export type FlightSearchInput = z.infer<typeof flightSearchSchema>;

export const placeQuerySchema = z.object({
  query: z.string().trim().min(2, "Type at least 2 characters").max(80),
});
export type PlaceQueryInput = z.infer<typeof placeQuerySchema>;

export const offerIdSchema = z.object({
  offerId: z.string().trim().min(1).max(120),
});
export type OfferIdInput = z.infer<typeof offerIdSchema>;

// ---------------------------------------------------------------- Hotels

export const hotelAvailabilitySchema = z
  .object({
    destinationCode: z.string().trim().min(2).max(10).toUpperCase(),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    rooms: z.number().int().min(1).max(5),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });
export type HotelAvailabilityInput = z.infer<typeof hotelAvailabilitySchema>;

export const hotelCodeSchema = z.object({
  code: z.string().trim().min(1).max(20),
});
export type HotelCodeInput = z.infer<typeof hotelCodeSchema>;

/** Hotelbeds rate keys are long opaque tokens (often 150–400 chars). */
export const rateKeySchema = z.object({
  rateKey: z.string().trim().min(10, "Invalid rate key").max(1000),
});
export type RateKeyInput = z.infer<typeof rateKeySchema>;

// ------------------------------------------------- Booking-flow preparation

const paxCount = z.object({
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8),
});

/**
 * Stage a TravelOS draft booking from a live-validated flight offer. The
 * server re-prices the offer against Duffel before writing anything — the
 * client-side amount is never trusted.
 */
export const prepareFlightBookingSchema = paxCount.extend({
  offerId: z.string().trim().min(1).max(120),
  customerId: z.string().cuid("Select a customer"),
});
export type PrepareFlightBookingInput = z.infer<typeof prepareFlightBookingSchema>;

/**
 * Stage a TravelOS draft booking from a hotel rate. The server re-validates
 * the rate via Hotelbeds `checkrates` before writing anything.
 */
export const prepareHotelBookingSchema = paxCount.extend({
  rateKey: z.string().trim().min(10).max(1000),
  customerId: z.string().cuid("Select a customer"),
  checkIn: isoDate,
  checkOut: isoDate,
});
export type PrepareHotelBookingInput = z.infer<typeof prepareHotelBookingSchema>;

// ------------------------------------------------------------ Activities

export const activitySearchSchema = z
  .object({
    destinationCode: z.string().trim().min(2).max(10).toUpperCase(),
    from: isoDate,
    to: isoDate,
  })
  .refine((d) => d.to >= d.from, { message: "End date before start", path: ["to"] });
export type ActivitySearchInput = z.infer<typeof activitySearchSchema>;

// ------------------------------------------------------------- Transfers

export const transferSearchSchema = z.object({
  fromType: z.enum(["IATA", "ATLAS"]),
  fromCode: z.string().trim().min(2).max(10).toUpperCase(),
  toType: z.enum(["IATA", "ATLAS"]),
  toCode: z.string().trim().min(2).max(10).toUpperCase(),
  outboundDate: isoDate,
  outboundTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8),
  infants: z.number().int().min(0).max(4),
});
export type TransferSearchInput = z.infer<typeof transferSearchSchema>;

// ------------------------------------------------------------------ Sync

export const SYNC_DATASETS = [
  "countries",
  "destinations",
  "hotels",
  "amenities",
  "airports",
  "airlines",
] as const;
export type SyncDataset = (typeof SYNC_DATASETS)[number];

export const runSyncSchema = z.object({
  dataset: z.enum(SYNC_DATASETS),
  /** For hotel imports: which destination to import hotels for. */
  destinationCode: z.string().trim().max(10).optional().or(z.literal("")),
});
export type RunSyncInput = z.infer<typeof runSyncSchema>;

// ------------------------------------------------------------------ Logs

export const logsFiltersSchema = z.object({
  provider: z.enum(INTEGRATION_TYPE_VALUES).or(z.literal("all")).optional(),
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR", "all"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type LogsFilters = z.infer<typeof logsFiltersSchema>;
