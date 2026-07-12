import type {
  ActivitySummaryDto,
  CountryDto,
  DestinationDto,
  FacilityDto,
  HotelAvailabilityDto,
  HotelDetailDto,
  HotelRateCheckDto,
  HotelRateDto,
  HotelRateType,
  HotelSummaryDto,
  TransferOptionDto,
} from "@/features/integrations/lib/dto";

/**
 * Maps Hotelbeds wire formats (Hotel Booking API, Content API, Activities
 * API, Transfers API) into TravelOS DTOs. Defensive access throughout — a
 * missing field degrades to null, never a crash.
 */

type Raw = Record<string, unknown>;

function str(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function obj(value: unknown): Raw {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
}

function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? (value as Raw[]) : [];
}

/** Content API i18n fields come as { content: "…" } or plain strings. */
function content(value: unknown): string | null {
  if (typeof value === "string") return value;
  return str(obj(value).content);
}

/** Hotelbeds category codes like "4EST" → 4 stars. */
export function starsFromCategoryCode(code: string | null): number | null {
  if (!code) return null;
  const match = code.match(/^(\d)/);
  if (!match) return null;
  const stars = Number(match[1]);
  return stars >= 1 && stars <= 5 ? stars : null;
}

const IMAGE_BASE = "https://photos.hotelbeds.com/giata/";

export class HotelbedsMapper {
  toDestinationDtos(data: Raw): DestinationDto[] {
    return arr(data.destinations).map((d) => ({
      code: str(d.code) ?? "",
      name: content(d.name) ?? str(d.code) ?? "Unknown",
      countryCode: str(d.countryCode),
      zoneCount: arr(d.zones).length || undefined,
    }));
  }

  toCountryDtos(data: Raw): CountryDto[] {
    return arr(data.countries).map((c) => ({
      code: str(c.code) ?? "",
      name: content(c.description) ?? str(c.code) ?? "Unknown",
    }));
  }

  toFacilityDtos(data: Raw): FacilityDto[] {
    return arr(data.facilities)
      .map((f) => {
        const code = num(f.code);
        const group = num(f.facilityGroupCode);
        return {
          code: group != null && code != null ? `${group}-${code}` : (str(f.code) ?? ""),
          name: content(f.description) ?? "",
        };
      })
      .filter((f) => f.code && f.name);
  }

  private toHotelSummaryDto(h: Raw): HotelSummaryDto {
    const images = arr(h.images);
    const thumbnail = images.find((i) => str(i.path)) ?? null;
    const categoryCode = str(h.categoryCode) ?? str(obj(h.category).code);

    return {
      code: str(h.code) ?? "",
      name: content(h.name) ?? "Unknown hotel",
      categoryName: str(obj(h.category).description) ?? categoryCode,
      stars: starsFromCategoryCode(categoryCode),
      destinationCode: str(h.destinationCode) ?? str(obj(h.destination).code),
      city: content(h.city) ?? str(obj(h.city).content),
      countryCode: str(h.countryCode),
      latitude: num(obj(h.coordinates).latitude),
      longitude: num(obj(h.coordinates).longitude),
      thumbnailUrl: thumbnail ? `${IMAGE_BASE}${str(thumbnail.path)}` : null,
    };
  }

  toHotelSummaryDtos(data: Raw): HotelSummaryDto[] {
    return arr(data.hotels).map((h) => this.toHotelSummaryDto(h));
  }

  toHotelDetailDto(data: Raw): HotelDetailDto {
    const h = obj(data.hotel);
    const base = this.toHotelSummaryDto(h);
    const address = obj(h.address);

    return {
      ...base,
      description: content(h.description),
      address: content(address.content) ?? str(address.street),
      email: str(h.email),
      phone: str(arr(h.phones)[0]?.phoneNumber),
      website: str(h.web),
      facilities: arr(h.facilities)
        .map((f) => content(obj(f).description) ?? "")
        .filter(Boolean)
        .slice(0, 40),
      images: arr(h.images)
        .slice(0, 20)
        .map((i) => ({
          url: `${IMAGE_BASE}${str(i.path) ?? ""}`,
          type: str(obj(i.type).description) ?? str(i.imageTypeCode),
        }))
        .filter((i) => i.url !== IMAGE_BASE),
      rooms: arr(h.rooms)
        .slice(0, 30)
        .map((r) => ({
          code: str(r.roomCode) ?? "",
          name: content(obj(r).description) ?? str(r.roomType) ?? "Room",
        }))
        .filter((r) => r.code),
    };
  }

  private toRateType(value: unknown): HotelRateType | null {
    return value === "BOOKABLE" || value === "RECHECK" ? value : null;
  }

  private toRateDto(room: Raw, rate: Raw): HotelRateDto {
    const taxesBlock = obj(rate.taxes);
    const taxes = arr(taxesBlock.taxes);
    const taxAmounts = taxes.map((t) => num(t.amount)).filter((a): a is number => a != null);

    return {
      rateKey: str(rate.rateKey),
      roomCode: str(room.code),
      roomName: str(room.name) ?? str(room.code) ?? "Room",
      boardName: str(rate.boardName),
      price: num(rate.net) ?? num(rate.sellingRate) ?? 0,
      currency: "",
      cancellable: arr(rate.cancellationPolicies).length > 0,
      rateType: this.toRateType(rate.rateType),
      paymentType: str(rate.paymentType),
      rooms: num(rate.rooms) ?? 1,
      adults: num(rate.adults) ?? 0,
      children: num(rate.children) ?? 0,
      cancellationPolicies: arr(rate.cancellationPolicies).map((p) => ({
        from: str(p.from),
        amount: num(p.amount),
      })),
      taxAmount: taxAmounts.length > 0 ? taxAmounts.reduce((a, b) => a + b, 0) : null,
      taxesIncluded:
        typeof taxesBlock.allIncluded === "boolean" ? taxesBlock.allIncluded : null,
      allotment: num(rate.allotment),
    };
  }

  private toAvailabilityDto(h: Raw, currency: string, maxRatesPerRoom: number, maxRates: number): HotelAvailabilityDto {
    const rates: HotelRateDto[] = [];
    for (const room of arr(h.rooms)) {
      for (const rate of arr(room.rates).slice(0, maxRatesPerRoom)) {
        rates.push({ ...this.toRateDto(room, rate), currency });
      }
    }
    return {
      code: str(h.code) ?? "",
      name: str(h.name) ?? "Unknown hotel",
      categoryName: str(h.categoryName),
      destinationName: str(h.destinationName),
      minPrice: num(h.minRate),
      currency,
      rates: rates.slice(0, maxRates),
    };
  }

  toAvailabilityDtos(data: Raw): HotelAvailabilityDto[] {
    const hotelsBlock = obj(data.hotels);
    const currency = str(hotelsBlock.currency) ?? "EUR";
    return arr(hotelsBlock.hotels).map((h) => this.toAvailabilityDto(h, currency, 4, 8));
  }

  /** `checkrates` returns a single hotel with the requested rate re-priced live. */
  toRateCheckDto(data: Raw): HotelRateCheckDto | null {
    const h = obj(data.hotel);
    if (!str(h.code) && !str(h.name)) return null;
    const currency = str(h.currency) ?? "EUR";
    return {
      hotel: this.toAvailabilityDto(h, currency, 10, 20),
      checkIn: str(h.checkIn),
      checkOut: str(h.checkOut),
      totalNet: num(h.totalNet),
    };
  }

  toActivityDtos(data: Raw): ActivitySummaryDto[] {
    return arr(data.activities).map((a) => {
      const amountsFrom = arr(a.amountsFrom);
      const first = amountsFrom[0] ?? {};
      const images = arr(obj(a.content).media ? obj(obj(a.content).media).images : a.images);
      const firstImage = obj(images[0]);
      const urls = arr(firstImage.urls);

      return {
        code: str(a.code) ?? "",
        name: str(a.name) ?? content(obj(a.content).name) ?? "Unknown activity",
        categoryName:
          str(obj(arr(obj(a.content).segmentationGroups)[0]).name) ?? str(a.type),
        destination: str(obj(a.country).destinations ? "" : a.destination) ?? null,
        durationText: str(obj(a.duration).value)
          ? `${str(obj(a.duration).value)} ${str(obj(a.duration).metric) ?? ""}`.trim()
          : null,
        fromPrice: num(first.amount),
        currency: str(a.currency) ?? str(data.currency as string),
        imageUrl: str(obj(urls[0]).resource),
      };
    });
  }

  toTransferDtos(data: Raw): TransferOptionDto[] {
    return arr(data.services).map((s, i) => {
      const price = obj(s.price);
      const category = obj(s.category);
      const vehicle = obj(s.vehicle);
      const pickup = obj(s.pickupInformation);
      return {
        id: str(s.id) ?? str(s.rateKey) ?? `transfer-${i}`,
        category: str(category.name),
        vehicle: str(vehicle.name),
        transferType: str(s.transferType),
        price: num(price.totalAmount),
        currency: str(price.currencyId),
        pickupInfo: str(obj(pickup.pickup).description),
      };
    });
  }
}
