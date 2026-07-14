"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Building2, MapPin, Search, ShoppingCart, Star, Ticket, Bus } from "lucide-react";

import type {
  ActivitySummaryDto,
  DestinationDto,
  HotelAvailabilityDto,
  HotelDetailDto,
  HotelRateDto,
  TransferOptionDto,
} from "@/features/integrations/lib/dto";
import {
  searchHotelbedsDestinationsAction,
  searchHotelbedsAvailabilityAction,
  getHotelbedsHotelDetailsAction,
  checkHotelbedsRatesAction,
  searchHotelbedsActivitiesAction,
  searchHotelbedsTransfersAction,
} from "@/features/integrations/actions/hotelbeds.action";
import { prepareHotelBookingAction } from "@/features/integrations/actions/booking-prep.action";
import { CreateBookingDialog } from "@/features/integrations/components/create-booking-dialog";
import type { CustomerOption } from "@/features/bookings/queries/booking-options.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customers: CustomerOption[];
  canCreateBooking: boolean;
};

type PanelProps = { tenantId: string };

export function HotelbedsExplorer({ tenantId, tenantSlug, customers, canCreateBooking }: Props) {
  return (
    <Tabs defaultValue="hotels">
      <TabsList className="mb-6">
        <TabsTrigger value="hotels">Hotels</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="transfers">Transfers</TabsTrigger>
      </TabsList>

      <TabsContent value="hotels">
        <HotelsPanel
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          customers={customers}
          canCreateBooking={canCreateBooking}
        />
      </TabsContent>
      <TabsContent value="activities">
        <ActivitiesPanel tenantId={tenantId} />
      </TabsContent>
      <TabsContent value="transfers">
        <TransfersPanel tenantId={tenantId} />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------- Hotels

function HotelsPanel({ tenantId, tenantSlug, customers, canCreateBooking }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoadingDetail, startDetail] = useTransition();

  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [destinationCode, setDestinationCode] = useState("");

  const today = new Date();
  const inDays = (n: number) =>
    new Date(today.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(inDays(30));
  const [checkOut, setCheckOut] = useState(inDays(33));
  const [adults, setAdults] = useState(2);

  const [results, setResults] = useState<HotelAvailabilityDto[] | null>(null);
  const [detail, setDetail] = useState<HotelDetailDto | null>(null);

  const [isValidating, startValidate] = useTransition();
  const [isBooking, startBooking] = useTransition();
  const [validatingKey, setValidatingKey] = useState<string | null>(null);
  const [bookingRate, setBookingRate] = useState<{ hotelName: string; rate: HotelRateDto } | null>(
    null,
  );

  function lookupDestinations() {
    if (destinationQuery.trim().length < 2) return;
    startTransition(async () => {
      const result = await searchHotelbedsDestinationsAction(tenantId, {
        query: destinationQuery.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDestinations(result.data.result);
      if (result.data.result.length === 0) toast.info("No destinations matched.");
    });
  }

  function searchAvailability() {
    startTransition(async () => {
      const result = await searchHotelbedsAvailabilityAction(tenantId, {
        destinationCode,
        checkIn,
        checkOut,
        adults,
        children: 0,
        rooms: 1,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setResults(result.data.result);
      setDetail(null);
      if (result.data.result.length === 0) {
        toast.info("No availability for this destination and dates.");
      }
    });
  }

  function loadDetails(code: string) {
    startDetail(async () => {
      const result = await getHotelbedsHotelDetailsAction(tenantId, { code });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDetail(result.data.result);
    });
  }

  /** Live checkrates: confirms price/availability and swaps in the rechecked rate. */
  function validateRate(hotelCode: string, rate: HotelRateDto) {
    if (!rate.rateKey) return;
    const key = rate.rateKey;
    setValidatingKey(key);
    startValidate(async () => {
      const result = await checkHotelbedsRatesAction(tenantId, { rateKey: key });
      setValidatingKey(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const check = result.data.result;
      const fresh = check?.hotel.rates[0];
      if (!check || !fresh) {
        toast.error("This rate is no longer available.");
        return;
      }
      setResults(
        (prev) =>
          prev?.map((h) =>
            h.code === hotelCode
              ? { ...h, rates: h.rates.map((r) => (r.rateKey === key ? fresh : r)) }
              : h,
          ) ?? prev,
      );
      toast.success(
        `Rate confirmed live: ${fresh.currency || check.hotel.currency} ${fresh.price.toLocaleString()} (${fresh.rateType ?? "validated"}).`,
      );
    });
  }

  function createBooking(customerId: string) {
    const selected = bookingRate;
    if (!selected?.rate.rateKey) return;
    startBooking(async () => {
      const result = await prepareHotelBookingAction(tenantId, {
        rateKey: selected.rate.rateKey!,
        customerId,
        checkIn,
        checkOut,
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
      setBookingRate(null);
      router.push(`/${tenantSlug}/bookings/${result.data.bookingId}`);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">1 — Find a destination code</h3>
        <div className="flex max-w-md gap-2">
          <Input
            placeholder="Palma, Barcelona, Dubai…"
            value={destinationQuery}
            onChange={(e) => setDestinationQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookupDestinations();
              }
            }}
          />
          <Button variant="outline" disabled={isPending} onClick={lookupDestinations}>
            <Search className="mr-1.5 size-4" />
            Search
          </Button>
        </div>
        {destinations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {destinations.slice(0, 12).map((destination) => (
              <button
                key={destination.code}
                type="button"
                onClick={() => setDestinationCode(destination.code)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  destinationCode === destination.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <MapPin className="mr-1 inline size-3" />
                {destination.name} ({destination.code})
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">2 — Search availability</h3>
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Destination code</label>
            <Input
              placeholder="PMI"
              className="uppercase"
              value={destinationCode}
              onChange={(e) => setDestinationCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Check-in</label>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Check-out</label>
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Adults</label>
            <Input
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={isPending || destinationCode.length < 2 || !checkIn || !checkOut}
              onClick={searchAvailability}
            >
              <Building2 className="mr-1.5 size-4" />
              {isPending ? "Searching…" : "Search"}
            </Button>
          </div>
        </div>

        {isPending && results === null && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {results && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {results.length} hotel{results.length !== 1 ? "s" : ""} with availability
            </p>
            {results.slice(0, 20).map((hotel) => (
              <div key={hotel.code} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{hotel.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {[hotel.categoryName, hotel.destinationName].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    {hotel.minPrice != null && (
                      <p className="font-semibold tabular-nums">
                        from {hotel.currency} {hotel.minPrice.toLocaleString()}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isLoadingDetail}
                      onClick={() => loadDetails(hotel.code)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
                {hotel.rates.length > 0 && (
                  <ul className="mt-2 divide-y text-xs">
                    {hotel.rates.slice(0, 4).map((rate, i) => (
                      <li key={rate.rateKey ?? i} className="flex flex-wrap items-center gap-2 py-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground font-medium">{rate.roomName}</span>
                          {rate.boardName ? ` · ${rate.boardName}` : ""}
                          {rate.cancellable ? " · cancellable" : " · non-refundable"}
                          {rate.allotment != null && rate.allotment <= 3
                            ? ` · only ${rate.allotment} left`
                            : ""}
                          {rate.rateComments && (
                            <span className="text-muted-foreground mt-0.5 block italic">
                              {rate.rateComments}
                            </span>
                          )}
                        </span>
                        {rate.rateType && (
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              rate.rateType === "BOOKABLE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {rate.rateType === "BOOKABLE" ? "Bookable" : "Recheck required"}
                          </span>
                        )}
                        <span className="font-semibold tabular-nums">
                          {rate.currency || hotel.currency} {rate.price.toLocaleString()}
                        </span>
                        {rate.rateKey && (
                          <span className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isValidating}
                              onClick={() => validateRate(hotel.code, rate)}
                            >
                              <BadgeCheck className="mr-1 size-3" />
                              {isValidating && validatingKey === rate.rateKey
                                ? "Checking…"
                                : "Validate"}
                            </Button>
                            {canCreateBooking && (
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setBookingRate({ hotelName: hotel.name, rate })}
                              >
                                <ShoppingCart className="mr-1 size-3" />
                                Book
                              </Button>
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateBookingDialog
        open={bookingRate != null}
        onOpenChange={(open) => {
          if (!open) setBookingRate(null);
        }}
        summary={
          bookingRate
            ? `${bookingRate.hotelName} · ${bookingRate.rate.roomName}` +
              (bookingRate.rate.boardName ? ` · ${bookingRate.rate.boardName}` : "") +
              ` · ${checkIn} → ${checkOut}`
            : ""
        }
        priceLabel={
          bookingRate
            ? `${bookingRate.rate.currency} ${bookingRate.rate.price.toLocaleString()}`
            : ""
        }
        rateComments={bookingRate?.rate.rateComments}
        currency={bookingRate?.rate.currency}
        cancellationPolicies={bookingRate?.rate.cancellationPolicies}
        customers={customers}
        busy={isBooking}
        onConfirm={createBooking}
      />

      {detail && (
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{detail.name}</h3>
              <p className="text-muted-foreground text-xs">
                {[detail.address, detail.city, detail.countryCode].filter(Boolean).join(", ")}
              </p>
            </div>
            {detail.stars != null && (
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: detail.stars }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </span>
            )}
          </div>
          {detail.description && (
            <p className="text-muted-foreground line-clamp-4 text-sm">{detail.description}</p>
          )}
          {detail.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {detail.images.slice(0, 8).map((image, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={image.url}
                  alt={image.type ?? detail.name}
                  className="h-24 w-36 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          {detail.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.facilities.slice(0, 15).map((facility, i) => (
                <span key={i} className="bg-muted rounded-full px-2 py-0.5 text-xs">
                  {facility}
                </span>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------- Activities

function ActivitiesPanel({ tenantId }: PanelProps) {
  const [isPending, startTransition] = useTransition();
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  const [destinationCode, setDestinationCode] = useState("");
  const [from, setFrom] = useState(inDays(30));
  const [to, setTo] = useState(inDays(33));
  const [activities, setActivities] = useState<ActivitySummaryDto[] | null>(null);

  function search() {
    startTransition(async () => {
      const result = await searchHotelbedsActivitiesAction(tenantId, {
        destinationCode,
        from,
        to,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setActivities(result.data.result);
      if (result.data.result.length === 0) toast.info("No activities returned.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Destination code</label>
          <Input
            placeholder="PMI"
            className="uppercase"
            value={destinationCode}
            onChange={(e) => setDestinationCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={isPending || destinationCode.length < 2}
            onClick={search}
          >
            <Ticket className="mr-1.5 size-4" />
            {isPending ? "Searching…" : "Search Activities"}
          </Button>
        </div>
      </div>

      {activities && (
        <div className="grid gap-3 sm:grid-cols-2">
          {activities.map((activity) => (
            <div key={activity.code} className="flex gap-3 rounded-lg border p-3">
              {activity.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activity.imageUrl}
                  alt={activity.name}
                  className="size-16 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="bg-muted flex size-16 shrink-0 items-center justify-center rounded-md">
                  <Ticket className="text-muted-foreground size-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{activity.name}</p>
                <p className="text-muted-foreground text-xs">
                  {[activity.categoryName, activity.durationText].filter(Boolean).join(" · ")}
                </p>
                {activity.fromPrice != null && (
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    from {activity.currency ?? ""} {activity.fromPrice.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Transfers

function TransfersPanel({ tenantId }: PanelProps) {
  const [isPending, startTransition] = useTransition();
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [date, setDate] = useState(inDays(30));
  const [time, setTime] = useState("10:00");
  const [transfers, setTransfers] = useState<TransferOptionDto[] | null>(null);

  function search() {
    startTransition(async () => {
      const result = await searchHotelbedsTransfersAction(tenantId, {
        fromType: "IATA",
        fromCode,
        toType: "ATLAS",
        toCode,
        outboundDate: date,
        outboundTime: time,
        adults: 2,
        children: 0,
        infants: 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTransfers(result.data.result);
      if (result.data.result.length === 0) toast.info("No transfer options returned.");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Airport transfer search: from an airport (IATA) to a destination zone (ATLAS code).
      </p>
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">From airport (IATA)</label>
          <Input
            placeholder="PMI"
            maxLength={3}
            className="uppercase"
            value={fromCode}
            onChange={(e) => setFromCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">To zone (ATLAS)</label>
          <Input
            placeholder="PMI"
            className="uppercase"
            value={toCode}
            onChange={(e) => setToCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Pickup time</label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={isPending || fromCode.length < 3 || toCode.length < 2}
            onClick={search}
          >
            <Bus className="mr-1.5 size-4" />
            {isPending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {transfers && (
        <ul className="divide-y rounded-lg border text-sm">
          {transfers.map((transfer) => (
            <li key={transfer.id} className="flex items-center gap-3 px-4 py-3">
              <Bus className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {[transfer.category, transfer.vehicle].filter(Boolean).join(" · ") || "Transfer"}
                </p>
                {transfer.pickupInfo && (
                  <p className="text-muted-foreground line-clamp-1 text-xs">{transfer.pickupInfo}</p>
                )}
              </div>
              {transfer.price != null && (
                <p className="font-semibold tabular-nums">
                  {transfer.currency ?? ""} {transfer.price.toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
