/**
 * Provider-independent DTOs. Every external response is mapped into these
 * shapes before leaving the integrations layer, so TravelOS business logic
 * and the database never depend on a provider's wire format.
 */

// ---------------------------------------------------------------------------
// Geography & reference data
// ---------------------------------------------------------------------------

export type CountryDto = {
  code: string;
  name: string;
};

export type DestinationDto = {
  code: string;
  name: string;
  countryCode: string | null;
  zoneCount?: number;
};

export type AirportDto = {
  iataCode: string;
  name: string;
  cityName: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string | null;
};

export type AirlineDto = {
  iataCode: string;
  name: string;
  logoUrl: string | null;
};

export type FacilityDto = {
  /** Stable composite code, e.g. "70-561" (group-facility) for Hotelbeds. */
  code: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

export type HotelSummaryDto = {
  code: string;
  name: string;
  categoryName: string | null;
  stars: number | null;
  destinationCode: string | null;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
};

export type HotelDetailDto = HotelSummaryDto & {
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  facilities: string[];
  images: { url: string; type: string | null }[];
  rooms: { code: string; name: string }[];
};

/**
 * Hotelbeds rate classification. BOOKABLE rates can be booked directly with
 * their rateKey; RECHECK rates MUST be re-priced via `checkrates` first —
 * price and availability are only guaranteed after that revalidation.
 */
export type HotelRateType = "BOOKABLE" | "RECHECK";

export type HotelCancellationPolicyDto = {
  /** ISO datetime from which the penalty applies. */
  from: string | null;
  amount: number | null;
};

export type HotelRateDto = {
  rateKey: string | null;
  roomCode: string | null;
  roomName: string;
  boardName: string | null;
  price: number;
  currency: string;
  cancellable: boolean;
  rateType: HotelRateType | null;
  /** AT_WEB (prepay to Hotelbeds) or AT_HOTEL (pay at property). */
  paymentType: string | null;
  rooms: number;
  adults: number;
  children: number;
  cancellationPolicies: HotelCancellationPolicyDto[];
  /** Sum of taxes reported on the rate; null when the supplier omits them. */
  taxAmount: number | null;
  taxesIncluded: boolean | null;
  /** Rooms left at this rate, when the supplier reports it. */
  allotment: number | null;
  /** Rate conditions/important notices Hotelbeds attaches to this rate
   * (cancellation nuances, at-property requirements, etc.) — shown to the
   * booking agent as-is before confirmation. `null` when Hotelbeds reports
   * none. See PROJECT.md, "Hotelbeds Certification — Rate Comments" for why
   * this is captured verbatim rather than re-worded. */
  rateComments: string | null;
};

export type HotelAvailabilityDto = {
  code: string;
  name: string;
  categoryName: string | null;
  destinationName: string | null;
  minPrice: number | null;
  currency: string | null;
  rates: HotelRateDto[];
};

export type HotelAvailabilitySearch = {
  destinationCode: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};

/**
 * Result of a Hotelbeds `checkrates` revalidation: the single hotel with its
 * rate re-priced live. A price change between search and recheck is normal —
 * the caller must show the rechecked price, never the cached one.
 */
export type HotelRateCheckDto = {
  hotel: HotelAvailabilityDto;
  checkIn: string | null;
  checkOut: string | null;
  totalNet: number | null;
};

/**
 * Hotelbeds booking-creation request shape. A booking names its own guests:
 * one `holder` (lead guest, matches the reservation name) plus a flat
 * `paxes` list, one entry per occupant, tagged AD/CH and grouped by
 * `roomId` (single-room bookings use `roomId: 1` throughout — nothing
 * upstream of this collects a per-guest room assignment for multi-room
 * bookings yet).
 */
export type HotelBookingPaxInput = {
  roomId: number;
  type: "AD" | "CH";
  firstName: string;
  lastName: string;
  /** Required by Hotelbeds for CH paxes; ignored for AD. */
  age: number | null;
};

export type CreateHotelBookingInput = {
  rateKey: string;
  holder: { firstName: string; lastName: string };
  paxes: HotelBookingPaxInput[];
  /** Echoed back by Hotelbeds on the booking record; TravelOS's own SupplierOrder id. */
  clientReference: string;
};

/**
 * Hotelbeds's own booking status vocabulary, kept as the wire values
 * (not translated to TravelOS's SupplierOrderStatus here — that mapping is
 * `HotelbedsExecutionProvider`'s job, not this DTO's). `UNKNOWN` is the
 * defensive fallback for any value Hotelbeds returns that isn't one of the
 * four documented ones, so a wire-format surprise degrades to "needs a
 * human to look," never a crash or a silently wrong success.
 */
export type HotelBookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "GUARANTEED" | "UNKNOWN";

export type HotelBookingDto = {
  reference: string;
  status: HotelBookingStatus;
  hotelName: string | null;
  totalNet: number | null;
  currency: string | null;
  checkIn: string | null;
  checkOut: string | null;
};

export type CancelHotelBookingDto = {
  reference: string;
  status: HotelBookingStatus;
  /** The cancellation penalty Hotelbeds charged, if any (rate-dependent). */
  cancellationAmount: number | null;
  currency: string | null;
};

// ---------------------------------------------------------------------------
// Activities & transfers
// ---------------------------------------------------------------------------

export type ActivitySummaryDto = {
  code: string;
  name: string;
  categoryName: string | null;
  destination: string | null;
  durationText: string | null;
  fromPrice: number | null;
  currency: string | null;
  imageUrl: string | null;
};

export type TransferOptionDto = {
  id: string;
  category: string | null;
  vehicle: string | null;
  transferType: string | null;
  price: number | null;
  currency: string | null;
  pickupInfo: string | null;
};

// ---------------------------------------------------------------------------
// Flights
// ---------------------------------------------------------------------------

export const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export type PassengerSpec = {
  adults: number;
  children: number;
  infants: number;
};

export type FlightSegmentDto = {
  origin: string;
  destination: string;
  departingAt: string;
  arrivingAt: string;
  carrierName: string | null;
  carrierIata: string | null;
  flightNumber: string | null;
  durationText: string | null;
  cabin: string | null;
};

export type FlightSliceDto = {
  origin: string;
  destination: string;
  durationText: string | null;
  segments: FlightSegmentDto[];
};

/** Offer passenger stub — provider-assigned passenger ids from search. */
export type FlightOfferPassengerDto = {
  id: string;
  type: string | null;
};

export type FlightOfferConditionsDto = {
  refundableBeforeDeparture: boolean | null;
  refundPenaltyAmount: number | null;
  changeableBeforeDeparture: boolean | null;
  changePenaltyAmount: number | null;
};

export type FlightOfferDto = {
  id: string;
  totalAmount: number;
  currency: string;
  /** Tax portion of totalAmount, when the carrier reports it. */
  taxAmount: number | null;
  ownerName: string | null;
  ownerIata: string | null;
  ownerLogoUrl: string | null;
  cabin: string | null;
  expiresAt: string | null;
  /** Hold deadline for pay-later offers; null means pay on order creation. */
  paymentRequiredBy: string | null;
  /** Until when the quoted price is guaranteed if the order is held. */
  priceGuaranteeExpiresAt: string | null;
  slices: FlightSliceDto[];
  passengerCount: number;
  passengers: FlightOfferPassengerDto[];
  conditions: FlightOfferConditionsDto;
};

export type FlightOfferSearch = {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  cabin: CabinClass;
  passengers: PassengerSpec;
};


export type FlightOrderDto = {
  id: string;
  bookingReference: string;
  totalAmount: number;
  currency: string;
  /** True for a "hold" order — reserved but not yet paid. */
  awaitingPayment: boolean;
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthCheckResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};
