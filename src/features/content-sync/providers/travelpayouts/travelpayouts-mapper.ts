import type {
  SyncedCityDto,
  SyncedCountryDto,
  SyncedHotelDto,
  SyncedImageDto,
} from "@/features/content-sync/lib/types";

type Raw = Record<string, unknown>;

/**
 * Every mapping function here is defensive on purpose: TravelPayouts'
 * static content responses are not behind a schema TravelOS controls, and
 * this codebase could not obtain live-verified field documentation while
 * building this client (see `travelpayouts-client.ts`'s header comment).
 * A record with an unexpected shape is skipped, never thrown — one bad
 * hotel entry must not fail an entire sync run. See
 * `content-sync/lib/plan.test.ts` and this file's own tests for the exact
 * tolerances asserted.
 */

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Ids/codes arrive as either a string or a bare JSON number — accept both. */
function asIdLike(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return asString(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * TravelPayouts' `name` field has been observed in at least two shapes
 * across their client libraries: a flat string, and a language-keyed map
 * (`{ en: "Paris", ru: "Париж" }` or the array-of-maps variant some Go
 * clients model). This tries every known shape before giving up.
 */
function extractName(raw: unknown): string | null {
  if (typeof raw === "string") return asString(raw);

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const name = extractName(entry);
      if (name) return name;
    }
    return null;
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Raw;
    const preferred = asString(obj.en) ?? asString(obj.EN);
    if (preferred) return preferred;
    for (const value of Object.values(obj)) {
      const name = extractName(value);
      if (name) return name;
    }
  }

  return null;
}

export class TravelPayoutsMapper {
  toCountryDto(raw: Raw): SyncedCountryDto | null {
    const code = asString(raw.code) ?? asString(raw.iso) ?? asIdLike(raw.id);
    const name = extractName(raw.name) ?? code;
    if (!code || !name) return null;
    return { code, name };
  }

  toCityDto(raw: Raw, countryCodeById: Map<string, string>): SyncedCityDto | null {
    const code = asIdLike(raw.code) ?? asIdLike(raw.id);
    const name = extractName(raw.name) ?? code;
    if (!code || !name) return null;

    const countryId = asIdLike(raw.countryId) ?? asIdLike(raw.country_id);
    const countryCode = countryId ? (countryCodeById.get(countryId) ?? null) : null;

    return { code, name, countryCode };
  }

  toHotelDto(raw: Raw, cityCodeById: Map<string, string>, fallbackCityCode: string): SyncedHotelDto | null {
    const code = asIdLike(raw.id) ?? asIdLike(raw.hotelId) ?? asIdLike(raw.code);
    const name = extractName(raw.name) ?? asString(raw.hotelName);
    if (!code || !name) return null;

    const cityId = asIdLike(raw.cityId) ?? asIdLike(raw.locationId);
    const cityCode = (cityId ? cityCodeById.get(cityId) : undefined) ?? fallbackCityCode;

    return {
      code,
      name,
      stars: asNumber(raw.stars),
      countryCode: asString(raw.countryCode) ?? null,
      cityCode,
      city: extractName(raw.city) ?? null,
      country: extractName(raw.country) ?? null,
      latitude: asNumber(raw.latitude) ?? asNumber(raw.lat),
      longitude: asNumber(raw.longitude) ?? asNumber(raw.lon) ?? asNumber(raw.lng),
      description: asString(raw.description),
      address: asString(raw.address),
      website: asString(raw.website),
      amenities: this.extractAmenities(raw.amenities),
      images: this.extractImages(raw.photos ?? raw.images),
    };
  }

  private extractAmenities(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const names: string[] = [];
    for (const entry of raw) {
      if (typeof entry === "string") {
        const name = asString(entry);
        if (name) names.push(name);
        continue;
      }
      if (entry && typeof entry === "object") {
        const name = asString((entry as Raw).name) ?? extractName((entry as Raw).name);
        if (name) names.push(name);
      }
    }
    return names;
  }

  /**
   * Only photo entries that already carry a full, directly-usable `url`
   * are kept — some TravelPayouts photo objects are documented as
   * dimension/id descriptors meant to be assembled into a CDN URL via a
   * template this codebase could not verify live (see the client's header
   * comment). Skipping those entries degrades gracefully (a hotel simply
   * gets fewer images) rather than persisting a guessed, possibly-broken
   * URL.
   */
  private extractImages(raw: unknown): SyncedImageDto[] {
    if (!Array.isArray(raw)) return [];
    const images: SyncedImageDto[] = [];
    for (const entry of raw) {
      if (typeof entry === "string") {
        const url = asString(entry);
        if (url) images.push({ url });
        continue;
      }
      if (entry && typeof entry === "object") {
        const obj = entry as Raw;
        const url = asString(obj.url) ?? asString(obj.original) ?? asString(obj.source);
        if (url) images.push({ url, alt: asString(obj.alt) ?? asString(obj.title) });
      }
    }
    return images;
  }
}
