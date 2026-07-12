import { describe, it, expect } from "vitest";

import {
  HotelbedsMapper,
  starsFromCategoryCode,
} from "@/features/integrations/providers/hotelbeds/hotelbeds-mapper";

const mapper = new HotelbedsMapper();

describe("starsFromCategoryCode", () => {
  it("extracts stars from Hotelbeds category codes", () => {
    expect(starsFromCategoryCode("4EST")).toBe(4);
    expect(starsFromCategoryCode("5EST")).toBe(5);
    expect(starsFromCategoryCode("1EST")).toBe(1);
  });

  it("returns null for non-star categories", () => {
    expect(starsFromCategoryCode("APTH")).toBeNull();
    expect(starsFromCategoryCode(null)).toBeNull();
    expect(starsFromCategoryCode("9XX")).toBeNull();
  });
});

describe("HotelbedsMapper.toDestinationDtos", () => {
  it("maps destinations with i18n content fields", () => {
    const dtos = mapper.toDestinationDtos({
      destinations: [
        {
          code: "PMI",
          name: { content: "Majorca" },
          countryCode: "ES",
          zones: [{ zoneCode: 1 }, { zoneCode: 2 }],
        },
      ],
    });
    expect(dtos).toEqual([
      { code: "PMI", name: "Majorca", countryCode: "ES", zoneCount: 2 },
    ]);
  });

  it("returns empty array for missing data", () => {
    expect(mapper.toDestinationDtos({})).toEqual([]);
  });
});

describe("HotelbedsMapper.toFacilityDtos", () => {
  it("builds composite group-code identifiers", () => {
    const dtos = mapper.toFacilityDtos({
      facilities: [
        { code: 561, facilityGroupCode: 70, description: { content: "Wi-Fi" } },
      ],
    });
    expect(dtos).toEqual([{ code: "70-561", name: "Wi-Fi" }]);
  });

  it("drops entries without a name", () => {
    const dtos = mapper.toFacilityDtos({
      facilities: [{ code: 1, facilityGroupCode: 2 }],
    });
    expect(dtos).toEqual([]);
  });
});

describe("HotelbedsMapper.toAvailabilityDtos", () => {
  it("maps hotels, rates, and shared currency", () => {
    const dtos = mapper.toAvailabilityDtos({
      hotels: {
        currency: "EUR",
        hotels: [
          {
            code: 1234,
            name: "Hotel Test Palma",
            categoryName: "4 STARS",
            destinationName: "Majorca",
            minRate: "120.50",
            rooms: [
              {
                code: "DBL.ST",
                name: "Double Standard",
                rates: [
                  {
                    rateKey: "20260801|20260804|...",
                    net: "120.50",
                    boardName: "BED AND BREAKFAST",
                    cancellationPolicies: [{ amount: "10" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(dtos).toHaveLength(1);
    expect(dtos[0].code).toBe("1234");
    expect(dtos[0].minPrice).toBe(120.5);
    expect(dtos[0].currency).toBe("EUR");
    expect(dtos[0].rates[0]).toMatchObject({
      roomName: "Double Standard",
      boardName: "BED AND BREAKFAST",
      price: 120.5,
      currency: "EUR",
      cancellable: true,
    });
  });

  it("survives an empty response", () => {
    expect(mapper.toAvailabilityDtos({})).toEqual([]);
  });
});
