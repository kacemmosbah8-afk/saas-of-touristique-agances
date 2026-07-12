import { describe, it, expect } from "vitest";

import {
  DuffelMapper,
  formatIsoDuration,
} from "@/features/integrations/providers/duffel/duffel-mapper";

const mapper = new DuffelMapper();

describe("formatIsoDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatIsoDuration("PT7H30M")).toBe("7h 30m");
    expect(formatIsoDuration("PT45M")).toBe("45m");
    expect(formatIsoDuration("P1DT2H")).toBe("1d 2h");
  });

  it("returns null for missing/invalid input", () => {
    expect(formatIsoDuration(null)).toBeNull();
    expect(formatIsoDuration(undefined)).toBeNull();
  });
});

describe("DuffelMapper.toAirportDto", () => {
  it("maps a Duffel airport payload", () => {
    const dto = mapper.toAirportDto({
      iata_code: "LHR",
      name: "Heathrow Airport",
      city_name: "London",
      iata_country_code: "GB",
      latitude: 51.4706,
      longitude: -0.461941,
      time_zone: "Europe/London",
    });
    expect(dto).toEqual({
      iataCode: "LHR",
      name: "Heathrow Airport",
      cityName: "London",
      countryCode: "GB",
      latitude: 51.4706,
      longitude: -0.461941,
      timeZone: "Europe/London",
    });
  });

  it("degrades missing fields to null", () => {
    const dto = mapper.toAirportDto({ iata_code: "XXX" });
    expect(dto.name).toBe("Unknown airport");
    expect(dto.cityName).toBeNull();
    expect(dto.latitude).toBeNull();
  });
});

describe("DuffelMapper.toOfferDto", () => {
  const offer = {
    id: "off_123",
    total_amount: "842.50",
    total_currency: "USD",
    expires_at: "2026-07-11T10:00:00Z",
    owner: { name: "British Airways", iata_code: "BA", logo_symbol_url: "https://x/ba.svg" },
    passengers: [{ id: "p1" }, { id: "p2" }],
    slices: [
      {
        origin: { iata_code: "LHR" },
        destination: { iata_code: "JFK" },
        duration: "PT8H15M",
        segments: [
          {
            origin: { iata_code: "LHR" },
            destination: { iata_code: "JFK" },
            departing_at: "2026-08-01T09:00:00",
            arriving_at: "2026-08-01T12:15:00",
            duration: "PT8H15M",
            marketing_carrier: { name: "British Airways", iata_code: "BA" },
            marketing_carrier_flight_number: "117",
            passengers: [{ cabin_class: "economy", cabin_class_marketing_name: "Economy" }],
          },
        ],
      },
    ],
  };

  it("maps amounts, owner, slices, and segments", () => {
    const dto = mapper.toOfferDto(offer);
    expect(dto.id).toBe("off_123");
    expect(dto.totalAmount).toBe(842.5);
    expect(dto.currency).toBe("USD");
    expect(dto.ownerName).toBe("British Airways");
    expect(dto.passengerCount).toBe(2);
    expect(dto.cabin).toBe("Economy");
    expect(dto.slices).toHaveLength(1);
    expect(dto.slices[0].origin).toBe("LHR");
    expect(dto.slices[0].durationText).toBe("8h 15m");
    expect(dto.slices[0].segments[0].flightNumber).toBe("117");
    expect(dto.slices[0].segments[0].carrierIata).toBe("BA");
  });

  it("survives an empty payload", () => {
    const dto = mapper.toOfferDto({});
    expect(dto.totalAmount).toBe(0);
    expect(dto.slices).toEqual([]);
    expect(dto.passengerCount).toBe(0);
  });
});
