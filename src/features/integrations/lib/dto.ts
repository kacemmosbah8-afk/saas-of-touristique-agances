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

export type HotelRateDto = {
  rateKey: string | null;
  roomName: string;
  boardName: string | null;
  price: number;
  currency: string;
  cancellable: boolean;
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

export type FlightOfferDto = {
  id: string;
  totalAmount: number;
  currency: string;
  ownerName: string | null;
  ownerIata: string | null;
  ownerLogoUrl: string | null;
  cabin: string | null;
  expiresAt: string | null;
  slices: FlightSliceDto[];
  passengerCount: number;
};

export type FlightOfferSearch = {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  cabin: CabinClass;
  passengers: PassengerSpec;
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthCheckResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};
