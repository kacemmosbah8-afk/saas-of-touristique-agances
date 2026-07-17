import { describe, it, expect } from "vitest";

import { TravelPayoutsMapper } from "@/features/content-sync/providers/travelpayouts/travelpayouts-mapper";

const mapper = new TravelPayoutsMapper();

describe("TravelPayoutsMapper.toCountryDto", () => {
  it("maps a flat-string name", () => {
    expect(mapper.toCountryDto({ code: "FR", name: "France" })).toEqual({
      code: "FR",
      name: "France",
    });
  });

  it("maps a language-keyed name object, preferring English", () => {
    expect(mapper.toCountryDto({ code: "FR", name: { en: "France", ru: "Франция" } })).toEqual({
      code: "FR",
      name: "France",
    });
  });

  it("falls back to any language when English is absent", () => {
    expect(mapper.toCountryDto({ code: "FR", name: { ru: "Франция" } })).toEqual({
      code: "FR",
      name: "Франция",
    });
  });

  it("falls back to code as the id when code is missing", () => {
    expect(mapper.toCountryDto({ id: 123, name: "Somewhere" })).toEqual({
      code: "123",
      name: "Somewhere",
    });
  });

  it("returns null when no usable code exists", () => {
    expect(mapper.toCountryDto({ name: "Nowhere" })).toBeNull();
  });

  it("returns null when no usable name exists and no code to fall back to as a name", () => {
    expect(mapper.toCountryDto({ code: "XX", name: {} })).toEqual({ code: "XX", name: "XX" });
  });
});

describe("TravelPayoutsMapper.toCityDto", () => {
  it("resolves countryCode via the provided id→code map", () => {
    const countryCodeById = new Map([["9", "FR"]]);
    expect(mapper.toCityDto({ code: "PAR", name: "Paris", countryId: 9 }, countryCodeById)).toEqual({
      code: "PAR",
      name: "Paris",
      countryCode: "FR",
    });
  });

  it("returns null countryCode when the id isn't in the map", () => {
    expect(mapper.toCityDto({ code: "PAR", name: "Paris", countryId: 999 }, new Map())).toEqual({
      code: "PAR",
      name: "Paris",
      countryCode: null,
    });
  });

  it("returns null for a record with no code and no id", () => {
    expect(mapper.toCityDto({ name: "Nowhere" }, new Map())).toBeNull();
  });
});

describe("TravelPayoutsMapper.toHotelDto", () => {
  it("maps a well-formed hotel record", () => {
    const cityCodeById = new Map([["55", "PAR"]]);
    const dto = mapper.toHotelDto(
      {
        id: 42,
        name: "Hotel Lumiere",
        stars: 4,
        cityId: 55,
        latitude: 48.85,
        longitude: 2.35,
        description: "A charming hotel.",
        address: "1 Rue de Rivoli",
        website: "https://example.com",
        amenities: [{ name: "Free WiFi" }, "Pool"],
        photos: [{ url: "https://cdn.example.com/1.jpg", alt: "Lobby" }, "https://cdn.example.com/2.jpg"],
      },
      cityCodeById,
      "PAR",
    );

    expect(dto).toEqual({
      code: "42",
      name: "Hotel Lumiere",
      stars: 4,
      countryCode: null,
      cityCode: "PAR",
      city: null,
      country: null,
      latitude: 48.85,
      longitude: 2.35,
      description: "A charming hotel.",
      address: "1 Rue de Rivoli",
      website: "https://example.com",
      amenities: ["Free WiFi", "Pool"],
      images: [
        { url: "https://cdn.example.com/1.jpg", alt: "Lobby" },
        { url: "https://cdn.example.com/2.jpg" },
      ],
    });
  });

  it("falls back to the caller-supplied city code when cityId isn't resolvable", () => {
    const dto = mapper.toHotelDto({ id: 1, name: "Hotel X", cityId: 999 }, new Map(), "PAR");
    expect(dto?.cityCode).toBe("PAR");
  });

  it("skips photo entries with no resolvable URL rather than guessing one", () => {
    const dto = mapper.toHotelDto(
      { id: 1, name: "Hotel X", photos: [{ width: 300, height: 200 }] },
      new Map(),
      "PAR",
    );
    expect(dto?.images).toEqual([]);
  });

  it("returns null when the record has no id or name", () => {
    expect(mapper.toHotelDto({ stars: 3 }, new Map(), "PAR")).toBeNull();
  });

  it("tolerates missing amenities/photos arrays entirely", () => {
    const dto = mapper.toHotelDto({ id: 1, name: "Hotel X" }, new Map(), "PAR");
    expect(dto?.amenities).toEqual([]);
    expect(dto?.images).toEqual([]);
  });
});
