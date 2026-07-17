import type {
  SyncedCityDto,
  SyncedCountryDto,
  SyncedHotelDto,
  SyncedImageDto,
} from "@/features/content-sync/lib/types";

type Raw = Record<string, unknown>;

/**
 * Country/city mapping targets the real, live-verified shape of
 * `api.travelpayouts.com/data/en/{countries,cities}.json` (confirmed with a
 * real token 2026-07-17 — see `travelpayouts-client.ts`'s header comment):
 * flat records like `{ code: "FR", name: "France", name_translations: { en:
 * "France" }, currency: "EUR" }` for countries, and `{ code: "PAR", name:
 * "Paris", country_code: "FR", coordinates: { lat, lon }, ... }` for cities.
 * `code`/`country_code` are already the stable keys TravelOS needs — unlike
 * the old (now permanently discontinued) Hotellook static endpoints, there
 * is no numeric id to cross-reference, so this mapper needs no id→code
 * index for countries/cities.
 *
 * Hotel mapping still exists for architectural completeness (and is fully
 * unit-tested against the real, once-live Hotellook `static/hotels.json`
 * shape captured in the official docs) but `TravelPayoutsClient` no longer
 * calls it in practice — see that file's `fetchHotelsForLocation` comment
 * for why. Every mapping function here stays defensive on purpose: a
 * record with an unexpected shape is skipped, never thrown — one bad entry
 * must not fail an entire sync run.
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
 * Handles every language-keyed name shape observed across TravelPayouts'
 * APIs: a flat string, `{ en: "Paris" }` (Data API, lowercase), and the
 * older `{ EN: [{ isVariation: "0", name: "Algeria" }] }` array-of-variants
 * shape (Hotellook static docs). The last one has a real trap: blindly
 * recursing into `Object.values()` of a `{ isVariation, name }` entry hits
 * `isVariation` ("0"/"1", itself a non-empty string) before `name` — so
 * `isVariation` is explicitly skipped and `name`/`Name` explicitly
 * preferred rather than taking whichever key happens to iterate first.
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
    const preferred = asString(obj.en) ?? asString(obj.EN) ?? extractName(obj.en) ?? extractName(obj.EN);
    if (preferred) return preferred;
    if ("name" in obj || "Name" in obj) {
      const named = asString(obj.name) ?? asString(obj.Name) ?? extractName(obj.name) ?? extractName(obj.Name);
      if (named) return named;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key === "isVariation") continue;
      const name = extractName(value);
      if (name) return name;
    }
  }

  return null;
}

export class TravelPayoutsMapper {
  toCountryDto(raw: Raw): SyncedCountryDto | null {
    const code = asString(raw.code) ?? asString(raw.iso) ?? asIdLike(raw.id);
    const name = asString(raw.name) ?? extractName(raw.name_translations) ?? extractName(raw.name) ?? code;
    if (!code || !name) return null;
    return { code, name };
  }

  toCityDto(raw: Raw): SyncedCityDto | null {
    const code = asString(raw.code) ?? asIdLike(raw.id);
    const name = asString(raw.name) ?? extractName(raw.name_translations) ?? extractName(raw.name) ?? code;
    if (!code || !name) return null;

    const countryCode = asString(raw.country_code) ?? asString(raw.countryCode);
    return { code, name, countryCode: countryCode ?? null };
  }

  toHotelDto(raw: Raw, cityCodeById: Map<string, string>, fallbackCityCode: string): SyncedHotelDto | null {
    const code = asIdLike(raw.id) ?? asIdLike(raw.hotelId) ?? asIdLike(raw.code);
    const name = extractName(raw.name) ?? asString(raw.hotelName);
    if (!code || !name) return null;

    const cityId = asIdLike(raw.cityId) ?? asIdLike(raw.locationId);
    const cityCode = (cityId ? cityCodeById.get(cityId) : undefined) ?? fallbackCityCode;

    const location = raw.location && typeof raw.location === "object" ? (raw.location as Raw) : null;

    return {
      code,
      name,
      stars: asNumber(raw.stars),
      countryCode: asString(raw.countryCode) ?? null,
      cityCode,
      city: extractName(raw.city) ?? null,
      country: extractName(raw.country) ?? null,
      // Hotellook's static/hotels.json nests coordinates under `location:
      // { lat, lon }` rather than top-level fields — both are tolerated.
      latitude: asNumber(raw.latitude) ?? asNumber(raw.lat) ?? asNumber(location?.lat),
      longitude: asNumber(raw.longitude) ?? asNumber(raw.lon) ?? asNumber(raw.lng) ?? asNumber(location?.lon),
      description: asString(raw.description),
      // `address` in the real API is a language-keyed object
      // (`{ en: "...", ru: "..." }`), not a flat string.
      address: asString(raw.address) ?? extractName(raw.address),
      website: asString(raw.website),
      // `facilities` is an array of numeric ids into a master amenities
      // list this provider has no live endpoint to resolve (see the
      // client's header comment) — `shortFacilities` (plain human-readable
      // strings) is the only amenity data actually usable without it.
      amenities: this.extractAmenities(raw.shortFacilities ?? raw.amenities),
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
   * template. Skipping those entries degrades gracefully (a hotel simply
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
