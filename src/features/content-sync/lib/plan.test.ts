import { describe, it, expect } from "vitest";

import {
  planCityUpsert,
  planCountryUpsert,
  planDestinationUpsert,
  planHotelUpsert,
} from "@/features/content-sync/lib/plan";

const SOURCE = "TRAVELPAYOUTS" as const;

describe("planCountryUpsert", () => {
  it("creates when no existing row", () => {
    const plan = planCountryUpsert(null, { code: "FR", name: "France" }, SOURCE);
    expect(plan).toEqual({
      action: "create",
      data: { code: "FR", name: "France", source: SOURCE },
    });
  });

  it("skips when the name is unchanged", () => {
    const plan = planCountryUpsert({ name: "France" }, { code: "FR", name: "France" }, SOURCE);
    expect(plan).toEqual({ action: "skip" });
  });

  it("updates when the name changed", () => {
    const plan = planCountryUpsert({ name: "Old Name" }, { code: "FR", name: "France" }, SOURCE);
    expect(plan).toEqual({ action: "update", data: { name: "France" } });
  });
});

describe("planCityUpsert", () => {
  const incoming = { code: "PAR", name: "Paris", countryCode: "FR" };

  it("creates when no existing row", () => {
    const plan = planCityUpsert(null, incoming, SOURCE);
    expect(plan).toEqual({
      action: "create",
      data: { code: "PAR", name: "Paris", countryCode: "FR", source: SOURCE },
    });
  });

  it("skips when name and countryCode are unchanged", () => {
    const plan = planCityUpsert({ name: "Paris", countryCode: "FR" }, incoming, SOURCE);
    expect(plan).toEqual({ action: "skip" });
  });

  it("updates when countryCode changed", () => {
    const plan = planCityUpsert({ name: "Paris", countryCode: "XX" }, incoming, SOURCE);
    expect(plan).toEqual({ action: "update", data: { name: "Paris", countryCode: "FR" } });
  });
});

describe("planHotelUpsert", () => {
  const incoming = {
    code: "42",
    name: "Hotel Lumiere",
    stars: 4,
    countryCode: null,
    cityCode: "PAR",
    city: "Paris",
    country: "France",
    latitude: 48.85,
    longitude: 2.35,
    description: "A charming hotel.",
    address: "1 Rue de Rivoli",
    website: "https://example.com",
    amenities: ["Free WiFi", "Pool"],
    images: [],
  };

  it("creates when no existing row", () => {
    const plan = planHotelUpsert(null, incoming, SOURCE);
    expect(plan.action).toBe("create");
    if (plan.action === "create") {
      expect(plan.data.externalCode).toBe("42");
      expect(plan.data.name).toBe("Hotel Lumiere");
      expect(plan.data.source).toBe(SOURCE);
    }
  });

  it("skips when every tracked scalar is unchanged", () => {
    const plan = planHotelUpsert(
      {
        name: "Hotel Lumiere",
        stars: 4,
        city: "Paris",
        country: "France",
        latitude: 48.85,
        longitude: 2.35,
        description: "A charming hotel.",
        address: "1 Rue de Rivoli",
        website: "https://example.com",
        amenities: ["Free WiFi", "Pool"],
      },
      incoming,
      SOURCE,
    );
    expect(plan).toEqual({ action: "skip" });
  });

  it("updates when a scalar changed", () => {
    const plan = planHotelUpsert(
      {
        name: "Hotel Lumiere",
        stars: 3, // was 3, provider now reports 4
        city: "Paris",
        country: "France",
        latitude: 48.85,
        longitude: 2.35,
        description: "A charming hotel.",
        address: "1 Rue de Rivoli",
        website: "https://example.com",
        amenities: ["Free WiFi", "Pool"],
      },
      incoming,
      SOURCE,
    );
    expect(plan.action).toBe("update");
    if (plan.action === "update") expect(plan.data.stars).toBe(4);
  });

  it("updates when amenities changed (order-sensitive, length-sensitive)", () => {
    const plan = planHotelUpsert(
      {
        name: "Hotel Lumiere",
        stars: 4,
        city: "Paris",
        country: "France",
        latitude: 48.85,
        longitude: 2.35,
        description: "A charming hotel.",
        address: "1 Rue de Rivoli",
        website: "https://example.com",
        amenities: ["Free WiFi"],
      },
      incoming,
      SOURCE,
    );
    expect(plan.action).toBe("update");
  });
});

describe("planDestinationUpsert", () => {
  const incoming = { code: "PAR", name: "Paris", country: "France", city: "Paris" };

  it("creates when no existing row", () => {
    const plan = planDestinationUpsert(null, incoming, SOURCE);
    expect(plan.action).toBe("create");
    if (plan.action === "create") {
      expect(plan.data.externalCode).toBe("PAR");
      expect(plan.data.source).toBe(SOURCE);
    }
  });

  it("skips when unchanged", () => {
    const plan = planDestinationUpsert(
      { name: "Paris", country: "France", city: "Paris" },
      incoming,
      SOURCE,
    );
    expect(plan).toEqual({ action: "skip" });
  });

  it("updates when a field changed", () => {
    const plan = planDestinationUpsert(
      { name: "Paris", country: "Old Country", city: "Paris" },
      incoming,
      SOURCE,
    );
    expect(plan).toEqual({ action: "update", data: { name: "Paris", country: "France", city: "Paris" } });
  });
});
