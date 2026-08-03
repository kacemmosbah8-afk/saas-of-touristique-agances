/**
 * A flight with no price and no picture is a broken listing, not a lighter
 * one. Unlike Packages (duration, itinerary), a flight has no such
 * "program" content — just a price and at least one photo. Checked by
 * `createFlightAction` and `updateFlightStatusAction` before any
 * transition to PUBLISHED.
 */
export type FlightPublishInput = {
  basePrice: number | null;
  coverImageUrl: string | null;
  imageCount: number;
};

export function getMissingPublishRequirements(flight: FlightPublishInput): string[] {
  const missing: string[] = [];
  if (flight.basePrice == null) missing.push("a price");
  if (flight.coverImageUrl == null && flight.imageCount === 0) missing.push("at least one picture");
  return missing;
}
