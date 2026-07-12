import { describe, it, expect } from "vitest";

import { buildLiveClientFromRecord } from "@/features/integrations/lib/live-client-from-record";
import { DuffelClient } from "@/features/integrations/providers/duffel/duffel-client";
import { HotelbedsClient } from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import { AmadeusClient } from "@/features/integrations/providers/amadeus/amadeus-client";

describe("buildLiveClientFromRecord", () => {
  it("builds a Duffel client from OAUTH_TOKEN or API_KEY", () => {
    expect(buildLiveClientFromRecord("DUFFEL", { OAUTH_TOKEN: "t" }, "")).toBeInstanceOf(DuffelClient);
    expect(buildLiveClientFromRecord("DUFFEL", { API_KEY: "t" }, "")).toBeInstanceOf(DuffelClient);
    expect(buildLiveClientFromRecord("DUFFEL", {}, "")).toBeNull();
  });

  it("builds a Hotelbeds client and infers environment from base URL", () => {
    const test = buildLiveClientFromRecord(
      "HOTELBEDS",
      { API_KEY: "k", API_SECRET: "s" },
      "https://api.test.hotelbeds.com",
    );
    expect(test).toBeInstanceOf(HotelbedsClient);
    expect((test as HotelbedsClient).environment).toBe("test");

    const live = buildLiveClientFromRecord(
      "HOTELBEDS",
      { API_KEY: "k", API_SECRET: "s" },
      "https://api.hotelbeds.com",
    );
    expect((live as HotelbedsClient).environment).toBe("live");
  });

  it("requires both Hotelbeds key and secret", () => {
    expect(buildLiveClientFromRecord("HOTELBEDS", { API_KEY: "k" }, "")).toBeNull();
  });

  it("builds an Amadeus client from client id + secret", () => {
    expect(
      buildLiveClientFromRecord("AMADEUS", { API_KEY: "id", API_SECRET: "sec" }, ""),
    ).toBeInstanceOf(AmadeusClient);
    expect(buildLiveClientFromRecord("AMADEUS", { API_KEY: "id" }, "")).toBeNull();
  });

  it("returns null for providers with no live integration", () => {
    expect(buildLiveClientFromRecord("SABRE", { API_KEY: "x" }, "")).toBeNull();
  });
});
