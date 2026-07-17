import { describe, it, expect } from "vitest";

import { TravelPayoutsMapper } from "@/features/content-sync/providers/travelpayouts/travelpayouts-mapper";

const mapper = new TravelPayoutsMapper();

describe("TravelPayoutsMapper.toCountryDto", () => {
  it("maps a real Data API record (flat name, name_translations, currency)", () => {
    expect(
      mapper.toCountryDto({
        name_translations: { en: "Falkland Islands" },
        cases: { su: "Falkland Islands" },
        code: "FK",
        name: "Falkland Islands",
        currency: "FKP",
      }),
    ).toEqual({ code: "FK", name: "Falkland Islands" });
  });

  it("maps a flat-string name", () => {
    expect(mapper.toCountryDto({ code: "FR", name: "France" })).toEqual({
      code: "FR",
      name: "France",
    });
  });

  it("falls back to name_translations when the flat name is absent", () => {
    expect(mapper.toCountryDto({ code: "FR", name_translations: { en: "France" } })).toEqual({
      code: "FR",
      name: "France",
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

  it("falls back to the code as the name when nothing else resolves", () => {
    expect(mapper.toCountryDto({ code: "XX", name: {} })).toEqual({ code: "XX", name: "XX" });
  });

  it("does not mistake the old Hotellook isVariation flag for a name", () => {
    // The now-discontinued Hotellook static/countries.json shape —
    // { EN: [{ isVariation: "0", name: "Algeria" }] } — used to make
    // extractName's blind Object.values() traversal return "0" instead of
    // "Algeria" (isVariation iterates before name). Kept as a regression
    // test even though no live endpoint uses this shape today.
    expect(
      mapper.toCountryDto({
        id: "9",
        code: "DZ",
        name: { EN: [{ isVariation: "0", name: "Algeria" }], RU: [{ isVariation: "0", name: "Алжир" }] },
      }),
    ).toEqual({ code: "DZ", name: "Algeria" });
  });
});

describe("TravelPayoutsMapper.toCityDto", () => {
  it("maps a real Data API record (code is already the stable key, country_code needs no lookup)", () => {
    expect(
      mapper.toCityDto({
        name_translations: { en: "Rourkela" },
        cases: { su: "Rourkela" },
        country_code: "IN",
        code: "RRK",
        time_zone: "Asia/Kolkata",
        name: "Rourkela",
        coordinates: { lat: 22.260423, lon: 84.8535844 },
        has_flightable_airport: true,
      }),
    ).toEqual({ code: "RRK", name: "Rourkela", countryCode: "IN" });
  });

  it("returns null countryCode when country_code is absent", () => {
    expect(mapper.toCityDto({ code: "PAR", name: "Paris" })).toEqual({
      code: "PAR",
      name: "Paris",
      countryCode: null,
    });
  });

  it("returns null for a record with no code and no id", () => {
    expect(mapper.toCityDto({ name: "Nowhere" })).toBeNull();
  });
});

describe("TravelPayoutsMapper.toHotelDto", () => {
  it("maps a real Hotellook static/hotels.json record (nested location, object address, shortFacilities)", () => {
    const cityCodeById = new Map([["895", "WEE"]]);
    const dto = mapper.toHotelDto(
      {
        id: 1399511245,
        cityId: 895,
        stars: 0,
        pricefrom: 30,
        rating: 0,
        popularity: 900,
        propertyType: 6,
        checkIn: "14:00",
        checkOut: "12:00",
        distance: 6,
        photoCount: 9,
        photos: [{ url: "http://photo.hotellook.com/image_v2/limit/h1399511245_8/320/240.auto", width: 320, height: 240 }],
        facilities: [7],
        shortFacilities: ["restaurant", "pool"],
        location: { lon: 81.201033, lat: 6.208641 },
        name: { en: "Sayonara Resorts" },
        address: { ru: "Sayonara Resorts - Pallemalala", en: "Sayonara Resorts - Pallemalala, Weligatta" },
        link: "/lk/weerawila-895/sayonara_resorts-1399511245.html",
      },
      cityCodeById,
      "WEE",
    );

    expect(dto).toEqual({
      code: "1399511245",
      name: "Sayonara Resorts",
      stars: 0,
      countryCode: null,
      cityCode: "WEE",
      city: null,
      country: null,
      latitude: 6.208641,
      longitude: 81.201033,
      description: null,
      address: "Sayonara Resorts - Pallemalala, Weligatta",
      website: null,
      amenities: ["restaurant", "pool"],
      images: [{ url: "http://photo.hotellook.com/image_v2/limit/h1399511245_8/320/240.auto", alt: null }],
    });
  });

  it("maps a well-formed hotel record with legacy flat lat/lon and string address", () => {
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
