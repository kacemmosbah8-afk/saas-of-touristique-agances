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

  it("captures booking-prep fields: rateType, paymentType, occupancy, policies, taxes, allotment", () => {
    const dtos = mapper.toAvailabilityDtos({
      hotels: {
        currency: "EUR",
        hotels: [
          {
            code: 77,
            name: "Recheck Hotel",
            rooms: [
              {
                code: "DBL.ST",
                name: "Double",
                rates: [
                  {
                    rateKey: "key-1",
                    net: "200.00",
                    rateType: "RECHECK",
                    paymentType: "AT_WEB",
                    rooms: 2,
                    adults: 2,
                    children: 1,
                    allotment: 5,
                    cancellationPolicies: [
                      { from: "2026-08-20T23:59:00+02:00", amount: "50.00" },
                    ],
                    taxes: {
                      allIncluded: false,
                      taxes: [{ amount: "12.50" }, { amount: "3.00" }],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(dtos[0].rates[0]).toMatchObject({
      rateKey: "key-1",
      roomCode: "DBL.ST",
      rateType: "RECHECK",
      paymentType: "AT_WEB",
      rooms: 2,
      adults: 2,
      children: 1,
      allotment: 5,
      taxAmount: 15.5,
      taxesIncluded: false,
    });
    expect(dtos[0].rates[0].cancellationPolicies).toEqual([
      { from: "2026-08-20T23:59:00+02:00", amount: 50 },
    ]);
  });

  it("treats unknown rateType values as null", () => {
    const dtos = mapper.toAvailabilityDtos({
      hotels: {
        hotels: [
          { code: 1, name: "H", rooms: [{ code: "R", rates: [{ rateType: "WEIRD" }] }] },
        ],
      },
    });
    expect(dtos[0].rates[0].rateType).toBeNull();
  });

  it("captures rateComments when present, and degrades to null when absent (BOOKABLE rates)", () => {
    const dtos = mapper.toAvailabilityDtos({
      hotels: {
        hotels: [
          {
            code: 1,
            name: "H",
            rooms: [
              {
                code: "R",
                rates: [
                  { rateKey: "with-comment", rateType: "BOOKABLE", rateComments: "No pets allowed. Early check-in subject to availability." },
                  { rateKey: "without-comment", rateType: "BOOKABLE" },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(dtos[0].rates[0].rateComments).toBe(
      "No pets allowed. Early check-in subject to availability.",
    );
    expect(dtos[0].rates[1].rateComments).toBeNull();
  });
});

describe("HotelbedsMapper.toRateCheckDto", () => {
  it("maps a checkrates response to a single re-priced hotel", () => {
    const dto = mapper.toRateCheckDto({
      hotel: {
        code: 1234,
        name: "Hotel Test Palma",
        currency: "EUR",
        checkIn: "2026-08-01",
        checkOut: "2026-08-04",
        totalNet: "241.00",
        rooms: [
          {
            code: "DBL.ST",
            name: "Double Standard",
            rates: [
              {
                rateKey: "rechecked-key",
                net: "241.00",
                rateType: "BOOKABLE",
                paymentType: "AT_WEB",
                cancellationPolicies: [{ from: "2026-07-28T23:59:00", amount: "120.50" }],
              },
            ],
          },
        ],
      },
    });

    expect(dto).not.toBeNull();
    expect(dto?.checkIn).toBe("2026-08-01");
    expect(dto?.totalNet).toBe(241);
    expect(dto?.hotel.rates[0]).toMatchObject({
      rateKey: "rechecked-key",
      price: 241,
      rateType: "BOOKABLE",
      currency: "EUR",
    });
  });

  it("returns null when the response has no hotel", () => {
    expect(mapper.toRateCheckDto({})).toBeNull();
  });

  it("captures rateComments on a rechecked RECHECK rate", () => {
    const dto = mapper.toRateCheckDto({
      hotel: {
        code: 1234,
        name: "Hotel Test Palma",
        rooms: [
          {
            code: "DBL.ST",
            rates: [
              {
                rateKey: "rechecked-key",
                rateType: "RECHECK",
                rateComments: "Rate is non-refundable once confirmed.",
              },
            ],
          },
        ],
      },
    });
    expect(dto?.hotel.rates[0].rateComments).toBe("Rate is non-refundable once confirmed.");
  });
});

describe("HotelbedsMapper.toCreateBookingPayload", () => {
  it("builds a single-room request with a holder and AD/CH paxes", () => {
    const payload = mapper.toCreateBookingPayload({
      rateKey: "rechecked-key",
      holder: { firstName: "Jane", lastName: "Doe" },
      paxes: [
        { roomId: 1, type: "AD", firstName: "Jane", lastName: "Doe", age: null },
        { roomId: 1, type: "CH", firstName: "Tom", lastName: "Doe", age: 8 },
      ],
      clientReference: "so_abc123",
    });

    expect(payload).toEqual({
      holder: { name: "Jane", surname: "Doe" },
      rooms: [
        {
          rateKey: "rechecked-key",
          paxes: [
            { roomId: 1, type: "AD", name: "Jane", surname: "Doe" },
            { roomId: 1, type: "CH", name: "Tom", surname: "Doe", age: 8 },
          ],
        },
      ],
      clientReference: "so_abc123",
    });
  });
});

describe("HotelbedsMapper.toHotelBookingDto", () => {
  it("maps a confirmed booking response", () => {
    const dto = mapper.toHotelBookingDto({
      booking: {
        reference: "9876543",
        status: "CONFIRMED",
        hotel: { name: "Hotel Test Palma", totalNet: "241.00", currency: "EUR", checkIn: "2026-08-01", checkOut: "2026-08-04" },
      },
    });
    expect(dto).toEqual({
      reference: "9876543",
      status: "CONFIRMED",
      hotelName: "Hotel Test Palma",
      totalNet: 241,
      currency: "EUR",
      checkIn: "2026-08-01",
      checkOut: "2026-08-04",
    });
  });

  it("falls back to UNKNOWN for an unrecognized status rather than guessing", () => {
    const dto = mapper.toHotelBookingDto({ booking: { reference: "1", status: "SOMETHING_NEW" } });
    expect(dto?.status).toBe("UNKNOWN");
  });

  it("returns null when the response has no booking reference", () => {
    expect(mapper.toHotelBookingDto({})).toBeNull();
  });
});

describe("HotelbedsMapper.toCancelBookingDto", () => {
  it("maps a cancellation response including any penalty", () => {
    const dto = mapper.toCancelBookingDto({
      booking: {
        reference: "9876543",
        status: "CANCELLED",
        hotel: { cancellationAmount: "25.00", currency: "EUR" },
      },
    });
    expect(dto).toEqual({
      reference: "9876543",
      status: "CANCELLED",
      cancellationAmount: 25,
      currency: "EUR",
    });
  });

  it("returns null when the response has no booking reference", () => {
    expect(mapper.toCancelBookingDto({})).toBeNull();
  });
});
