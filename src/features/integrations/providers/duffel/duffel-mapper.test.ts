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
    expect(dto.passengers).toEqual([]);
    expect(dto.paymentRequiredBy).toBeNull();
    expect(dto.conditions.refundableBeforeDeparture).toBeNull();
  });

  it("keeps provider passenger ids needed for order creation", () => {
    const dto = mapper.toOfferDto({
      ...offer,
      passengers: [
        { id: "pas_001", type: "adult" },
        { id: "pas_002", type: "child" },
      ],
    });
    expect(dto.passengers).toEqual([
      { id: "pas_001", type: "adult" },
      { id: "pas_002", type: "child" },
    ]);
  });

  it("maps payment requirements and fare conditions", () => {
    const dto = mapper.toOfferDto({
      ...offer,
      tax_amount: "112.30",
      payment_requirements: {
        payment_required_by: "2026-07-12T23:59:59Z",
        price_guarantee_expires_at: "2026-07-12T12:00:00Z",
      },
      conditions: {
        refund_before_departure: { allowed: true, penalty_amount: "150.00" },
        change_before_departure: { allowed: false, penalty_amount: null },
      },
    });
    expect(dto.taxAmount).toBe(112.3);
    expect(dto.paymentRequiredBy).toBe("2026-07-12T23:59:59Z");
    expect(dto.priceGuaranteeExpiresAt).toBe("2026-07-12T12:00:00Z");
    expect(dto.conditions).toEqual({
      refundableBeforeDeparture: true,
      refundPenaltyAmount: 150,
      changeableBeforeDeparture: false,
      changePenaltyAmount: null,
    });
  });
});

describe("DuffelMapper.toCreateOrderPayload", () => {
  it("builds a hold-order payload with no payments block", () => {
    const payload = mapper.toCreateOrderPayload({
      offerId: "off_123",
      type: "hold",
      payment: null,
      passengers: [
        {
          providerPassengerId: "pas_001",
          givenName: "Alex",
          familyName: "Rivera",
          bornOn: "1990-05-01",
          gender: "f",
          email: "alex@example.com",
          phoneNumber: "+15551234567",
          identityDocument: {
            uniqueIdentifier: "X1234567",
            expiresOn: "2030-01-01",
            issuingCountryCode: "US",
          },
        },
      ],
    });
    expect(payload).toMatchObject({
      type: "hold",
      selected_offers: ["off_123"],
    });
    expect(payload.payments).toBeUndefined();
    const passengers = payload.passengers as Record<string, unknown>[];
    expect(passengers[0]).toMatchObject({
      id: "pas_001",
      given_name: "Alex",
      family_name: "Rivera",
      title: "ms",
    });
    expect(passengers[0].identity_documents).toEqual([
      { type: "passport", unique_identifier: "X1234567", expires_on: "2030-01-01", issuing_country_code: "US" },
    ]);
  });

  it("includes a balance payment for an instant order", () => {
    const payload = mapper.toCreateOrderPayload({
      offerId: "off_123",
      type: "instant",
      payment: { amount: "842.50", currency: "USD", method: "balance" },
      passengers: [
        {
          providerPassengerId: "pas_001",
          givenName: "Jordan",
          familyName: "Lee",
          bornOn: null,
          gender: "m",
          email: null,
          phoneNumber: null,
          identityDocument: null,
        },
      ],
    });
    expect(payload.payments).toEqual([{ type: "balance", amount: "842.50", currency: "USD" }]);
    const passengers = payload.passengers as Record<string, unknown>[];
    expect(passengers[0].title).toBe("mr");
    expect(passengers[0].identity_documents).toBeUndefined();
  });

  it("uses whichever payment method the caller resolved, not a hardcoded type", () => {
    const payload = mapper.toCreateOrderPayload({
      offerId: "off_123",
      type: "instant",
      payment: { amount: "100.00", currency: "USD", method: "card" },
      passengers: [],
    });
    expect(payload.payments).toEqual([{ type: "card", amount: "100.00", currency: "USD" }]);
  });
});

describe("DuffelMapper.toFlightOrderDto", () => {
  it("maps a confirmed instant-purchase order", () => {
    const dto = mapper.toFlightOrderDto({
      id: "ord_123",
      booking_reference: "ABC123",
      total_amount: "842.50",
      total_currency: "USD",
      payment_status: { awaiting_payment: false },
    });
    expect(dto).toEqual({
      id: "ord_123",
      bookingReference: "ABC123",
      totalAmount: 842.5,
      currency: "USD",
      awaitingPayment: false,
    });
  });

  it("marks a hold order as awaiting payment", () => {
    const dto = mapper.toFlightOrderDto({
      id: "ord_456",
      booking_reference: "XYZ789",
      payment_status: { awaiting_payment: true },
    });
    expect(dto.awaitingPayment).toBe(true);
  });

  it("survives an empty payload", () => {
    const dto = mapper.toFlightOrderDto({});
    expect(dto.id).toBe("");
    expect(dto.awaitingPayment).toBe(false);
  });
});
