import type {
  ProviderAuthType,
  ProviderCredentialType,
  ProviderType,
} from "@prisma/client";

/**
 * Static metadata for every supported travel-tech provider. This registry is
 * the single source of truth the UI and actions read: display name, category,
 * which auth scheme it uses, which credential fields the connection form must
 * collect, default endpoints per environment, and the capabilities the
 * integration will expose once implemented in a later milestone.
 *
 * No external calls happen anywhere in this module — it is architecture only.
 */

export type ProviderMeta = {
  type: ProviderType;
  name: string;
  category: "FLIGHTS" | "HOTELS" | "MULTI";
  description: string;
  authType: ProviderAuthType;
  /** Credential slots the connection form collects for this provider. */
  credentialTypes: ProviderCredentialType[];
  sandboxUrl: string;
  productionUrl: string;
  capabilities: string[];
  /**
   * "live" — a real client exists, calls the provider's actual API, and is
   * meant to be connected by a tenant from the Providers dashboard (see
   * `LIVE_TYPES` in provider-adapter.ts).
   * "content-only" — a real, working integration, but not something a
   * tenant manually "connects" here: it's configured once via environment
   * variables and managed automatically (see `features/content-sync`). Not
   * shown in the manual-connect dashboard for that reason, not because it's
   * fake.
   * "planned" — no client has been built. Never shown in the UI as
   * something a user can connect today.
   */
  status: "live" | "content-only" | "planned";
};

export const PROVIDER_REGISTRY: Record<ProviderType, ProviderMeta> = {
  AMADEUS: {
    type: "AMADEUS",
    name: "Amadeus",
    category: "MULTI",
    description: "Global GDS — flights, hotels, transfers, and destination content.",
    authType: "OAUTH",
    credentialTypes: ["API_KEY", "API_SECRET"],
    sandboxUrl: "https://test.api.amadeus.com",
    productionUrl: "https://api.amadeus.com",
    capabilities: ["flight_search", "flight_booking", "hotel_search", "hotel_booking", "transfers"],
    status: "live",
  },
  HOTELBEDS: {
    type: "HOTELBEDS",
    name: "Hotelbeds",
    category: "HOTELS",
    description: "Bedbank with global hotel inventory and activities.",
    authType: "API_KEY",
    credentialTypes: ["API_KEY", "API_SECRET"],
    sandboxUrl: "https://api.test.hotelbeds.com",
    productionUrl: "https://api.hotelbeds.com",
    capabilities: ["hotel_search", "hotel_booking", "activities"],
    status: "live",
  },
  BOOKING: {
    type: "BOOKING",
    name: "Booking.com",
    category: "HOTELS",
    description: "Booking.com Demand API for accommodation.",
    authType: "API_KEY",
    credentialTypes: ["API_KEY", "USERNAME", "PASSWORD"],
    sandboxUrl: "https://distribution-xml.booking.com/sandbox",
    productionUrl: "https://distribution-xml.booking.com",
    capabilities: ["hotel_search", "hotel_booking"],
    status: "planned",
  },
  EXPEDIA: {
    type: "EXPEDIA",
    name: "Expedia (Rapid)",
    category: "HOTELS",
    description: "Expedia Rapid API for lodging distribution.",
    authType: "API_KEY",
    credentialTypes: ["API_KEY", "API_SECRET"],
    sandboxUrl: "https://test.ean.com",
    productionUrl: "https://api.ean.com",
    capabilities: ["hotel_search", "hotel_booking"],
    status: "planned",
  },
  TRAVELPORT: {
    type: "TRAVELPORT",
    name: "Travelport",
    category: "MULTI",
    description: "GDS platform (Galileo, Apollo, Worldspan).",
    authType: "OAUTH",
    credentialTypes: ["USERNAME", "PASSWORD", "ENDPOINT"],
    sandboxUrl: "https://api.pp.travelport.com",
    productionUrl: "https://api.travelport.com",
    capabilities: ["flight_search", "flight_booking", "hotel_search"],
    status: "planned",
  },
  SABRE: {
    type: "SABRE",
    name: "Sabre",
    category: "MULTI",
    description: "GDS — air, hotel, and car content.",
    authType: "OAUTH",
    credentialTypes: ["API_KEY", "API_SECRET"],
    sandboxUrl: "https://api.cert.platform.sabre.com",
    productionUrl: "https://api.platform.sabre.com",
    capabilities: ["flight_search", "flight_booking", "hotel_search", "car_rental"],
    status: "planned",
  },
  GOGLOBAL: {
    type: "GOGLOBAL",
    name: "GoGlobal",
    category: "HOTELS",
    description: "Wholesale hotel supplier (XML API).",
    authType: "SECRET",
    credentialTypes: ["USERNAME", "PASSWORD", "ENDPOINT"],
    sandboxUrl: "https://test.goglobal.travel",
    productionUrl: "https://api.goglobal.travel",
    capabilities: ["hotel_search", "hotel_booking"],
    status: "planned",
  },
  TBO: {
    type: "TBO",
    name: "TBO Holidays",
    category: "MULTI",
    description: "B2B travel marketplace — hotels, flights, transfers.",
    authType: "API_KEY",
    credentialTypes: ["USERNAME", "PASSWORD"],
    sandboxUrl: "https://apiwr.tboholidays.com/sandbox",
    productionUrl: "https://apiwr.tboholidays.com",
    capabilities: ["hotel_search", "hotel_booking", "transfers"],
    status: "planned",
  },
  JUNIPER: {
    type: "JUNIPER",
    name: "Juniper",
    category: "MULTI",
    description: "Travel technology platform with multi-supplier aggregation.",
    authType: "CERTIFICATE",
    credentialTypes: ["USERNAME", "PASSWORD", "CERTIFICATE", "ENDPOINT"],
    sandboxUrl: "https://juniper-sandbox.example",
    productionUrl: "https://juniper.example",
    capabilities: ["hotel_search", "activities", "transfers", "packages"],
    status: "planned",
  },
  TRAVELPAYOUTS: {
    type: "TRAVELPAYOUTS",
    name: "TravelPayouts",
    category: "HOTELS",
    description:
      "Content aggregator — hotels, destinations, cities, and countries for the public catalogue. Content only: never used for booking or execution.",
    authType: "API_KEY",
    credentialTypes: ["API_KEY"],
    sandboxUrl: "https://engine.hotellook.com",
    productionUrl: "https://engine.hotellook.com",
    capabilities: ["content_sync"],
    status: "content-only",
  },
};

export const PROVIDER_TYPES = Object.keys(PROVIDER_REGISTRY) as ProviderType[];

/**
 * Providers a tenant can manually connect from the Providers dashboard.
 * Excludes "planned" types (no real client exists yet — see each entry's
 * `status`) and "content-only" types (real, but configured once via
 * environment variables and managed automatically by `features/content-sync`,
 * not through this per-tenant credential flow).
 */
export const DASHBOARD_PROVIDER_TYPES = PROVIDER_TYPES.filter(
  (type) => PROVIDER_REGISTRY[type].status === "live",
);

export const CREDENTIAL_TYPE_LABELS: Record<ProviderCredentialType, string> = {
  API_KEY: "API Key",
  API_SECRET: "API Secret",
  OAUTH_TOKEN: "OAuth Token",
  REFRESH_TOKEN: "Refresh Token",
  CERTIFICATE: "Certificate",
  USERNAME: "Username",
  PASSWORD: "Password",
  ENDPOINT: "Custom Endpoint",
};

export const AUTH_TYPE_LABELS: Record<ProviderMeta["authType"], string> = {
  OAUTH: "OAuth 2.0",
  API_KEY: "API Key",
  SECRET: "Shared Secret",
  CERTIFICATE: "Client Certificate",
};
