"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Clock, Plane, Search, ShoppingCart } from "lucide-react";

import type { AirportDto, FlightOfferDto } from "@/features/integrations/lib/dto";
import {
  searchDuffelAirportsAction,
  searchDuffelOffersAction,
  getDuffelOfferAction,
} from "@/features/integrations/actions/duffel.action";
import { prepareFlightBookingAction } from "@/features/integrations/actions/booking-prep.action";
import { CreateBookingDialog } from "@/features/integrations/components/create-booking-dialog";
import type { CustomerOption } from "@/features/bookings/queries/booking-options.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customers: CustomerOption[];
  canCreateBooking: boolean;
};

const CABINS = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
] as const;

function formatTime(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DuffelExplorer({ tenantId, tenantSlug, customers, canCreateBooking }: Props) {
  const router = useRouter();
  const [isSearching, startSearch] = useTransition();
  const [isLookingUp, startLookup] = useTransition();
  const [isValidating, startValidate] = useTransition();
  const [isBooking, startBooking] = useTransition();
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [bookingOffer, setBookingOffer] = useState<FlightOfferDto | null>(null);

  // Airport lookup
  const [airportQuery, setAirportQuery] = useState("");
  const [airports, setAirports] = useState<AirportDto[]>([]);

  // Offer search
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [cabin, setCabin] = useState<(typeof CABINS)[number]["value"]>("economy");
  const [adults, setAdults] = useState(1);
  const [offers, setOffers] = useState<FlightOfferDto[] | null>(null);
  const [searchMs, setSearchMs] = useState<number | null>(null);

  function lookupAirports() {
    if (airportQuery.trim().length < 2) return;
    startLookup(async () => {
      const result = await searchDuffelAirportsAction(tenantId, { query: airportQuery.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAirports(result.data.result);
      if (result.data.result.length === 0) toast.info("No airports matched.");
    });
  }

  function searchOffers() {
    startSearch(async () => {
      const result = await searchDuffelOffersAction(tenantId, {
        origin,
        destination,
        departureDate,
        returnDate: returnDate || "",
        cabin,
        adults,
        children: 0,
        infants: 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOffers(result.data.result);
      setSearchMs(result.data.durationMs);
      if (result.data.result.length === 0) toast.info("No offers returned for this search.");
    });
  }

  /** Re-price one offer live against Duffel and swap it into the results. */
  function validatePrice(offerId: string) {
    setValidatingId(offerId);
    startValidate(async () => {
      const result = await getDuffelOfferAction(tenantId, { offerId });
      setValidatingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const fresh = result.data.result;
      setOffers((prev) => prev?.map((o) => (o.id === fresh.id ? fresh : o)) ?? prev);
      toast.success(
        `Price confirmed live: ${fresh.currency} ${fresh.totalAmount.toLocaleString()}` +
          (fresh.expiresAt
            ? ` (valid until ${new Date(fresh.expiresAt).toLocaleTimeString()})`
            : ""),
      );
    });
  }

  function createBooking(customerId: string) {
    const offer = bookingOffer;
    if (!offer) return;
    startBooking(async () => {
      const result = await prepareFlightBookingAction(tenantId, {
        offerId: offer.id,
        customerId,
        adults,
        children: 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Draft booking created at the live-validated price ${result.data.currency} ${result.data.validatedAmount.toLocaleString()}.`,
      );
      setBookingOffer(null);
      router.push(`/${tenantSlug}/bookings/${result.data.bookingId}`);
    });
  }

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------ Airport lookup */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Airport Search</h2>
        <div className="flex max-w-md gap-2">
          <Input
            placeholder="City or airport name…"
            value={airportQuery}
            onChange={(e) => setAirportQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookupAirports();
              }
            }}
          />
          <Button
            variant="outline"
            disabled={isLookingUp || airportQuery.trim().length < 2}
            onClick={lookupAirports}
          >
            <Search className="mr-1.5 size-4" />
            {isLookingUp ? "Searching…" : "Search"}
          </Button>
        </div>
        {airports.length > 0 && (
          <ul className="divide-y rounded-lg border text-sm">
            {airports.slice(0, 8).map((airport) => (
              <li key={airport.iataCode} className="flex items-center gap-3 px-4 py-2">
                <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                  {airport.iataCode}
                </span>
                <span className="flex-1">{airport.name}</span>
                <span className="text-muted-foreground text-xs">
                  {[airport.cityName, airport.countryCode].filter(Boolean).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------- Offer search */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Flight Offers</h2>
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="duffel-origin" className="text-xs font-medium">
              Origin (IATA)
            </label>
            <Input
              id="duffel-origin"
              placeholder="LHR"
              maxLength={3}
              className="uppercase"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duffel-destination" className="text-xs font-medium">
              Destination (IATA)
            </label>
            <Input
              id="duffel-destination"
              placeholder="JFK"
              maxLength={3}
              className="uppercase"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duffel-departure" className="text-xs font-medium">
              Departure
            </label>
            <Input
              id="duffel-departure"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duffel-return" className="text-xs font-medium">
              Return (optional)
            </label>
            <Input
              id="duffel-return"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duffel-cabin" className="text-xs font-medium">
              Cabin
            </label>
            <Select value={cabin} onValueChange={(v) => setCabin(v as typeof cabin)}>
              <SelectTrigger id="duffel-cabin" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CABINS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duffel-adults" className="text-xs font-medium">
              Adults
            </label>
            <Input
              id="duffel-adults"
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button
              className="w-full"
              disabled={
                isSearching || origin.length !== 3 || destination.length !== 3 || !departureDate
              }
              onClick={searchOffers}
            >
              <Plane className="mr-1.5 size-4" />
              {isSearching ? "Searching live offers…" : "Search Flights"}
            </Button>
          </div>
        </div>

        {isSearching && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {!isSearching && offers && (
          <>
            <p className="text-muted-foreground text-xs">
              {offers.length} offer{offers.length !== 1 ? "s" : ""}
              {searchMs != null ? ` · ${(searchMs / 1000).toFixed(1)}s` : ""}
            </p>
            <div className="space-y-2">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {offer.ownerLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={offer.ownerLogoUrl}
                          alt={offer.ownerName ?? ""}
                          className="size-6 rounded"
                        />
                      ) : (
                        <Plane className="text-muted-foreground size-4" />
                      )}
                      <span className="font-medium">{offer.ownerName ?? offer.ownerIata}</span>
                      {offer.cabin && (
                        <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs capitalize">
                          {offer.cabin.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold tabular-nums">
                      {offer.currency} {offer.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {offer.slices.map((slice, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold">{slice.origin}</span>
                          <ArrowRight className="text-muted-foreground size-3.5" />
                          <span className="font-mono font-semibold">{slice.destination}</span>
                          {slice.durationText && (
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Clock className="size-3" />
                              {slice.durationText}
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs">
                            {slice.segments.length - 1 === 0
                              ? "Non-stop"
                              : `${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}`}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                          {slice.segments.map((segment, j) => (
                            <p key={j}>
                              {segment.carrierIata} {segment.flightNumber} · {segment.origin}{" "}
                              {formatTime(segment.departingAt)} → {segment.destination}{" "}
                              {formatTime(segment.arrivingAt)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isValidating}
                      onClick={() => validatePrice(offer.id)}
                    >
                      <BadgeCheck className="mr-1.5 size-3.5" />
                      {isValidating && validatingId === offer.id
                        ? "Checking live price…"
                        : "Validate price"}
                    </Button>
                    {canCreateBooking && (
                      <Button size="sm" onClick={() => setBookingOffer(offer)}>
                        <ShoppingCart className="mr-1.5 size-3.5" />
                        Create booking
                      </Button>
                    )}
                    {offer.expiresAt && (
                      <span className="text-muted-foreground text-xs">
                        Offer valid until {formatTime(offer.expiresAt)}
                      </span>
                    )}
                    {offer.conditions.refundableBeforeDeparture != null && (
                      <span className="text-muted-foreground text-xs">
                        {offer.conditions.refundableBeforeDeparture
                          ? "Refundable before departure"
                          : "Non-refundable"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <CreateBookingDialog
        open={bookingOffer != null}
        onOpenChange={(open) => {
          if (!open) setBookingOffer(null);
        }}
        summary={
          bookingOffer
            ? `Flight ${bookingOffer.slices.map((s) => `${s.origin}→${s.destination}`).join(", ")}` +
              (bookingOffer.ownerName ? ` · ${bookingOffer.ownerName}` : "")
            : ""
        }
        priceLabel={
          bookingOffer
            ? `${bookingOffer.currency} ${bookingOffer.totalAmount.toLocaleString()}`
            : ""
        }
        customers={customers}
        busy={isBooking}
        onConfirm={createBooking}
      />
    </div>
  );
}
