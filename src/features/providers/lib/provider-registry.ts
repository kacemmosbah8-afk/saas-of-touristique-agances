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
  },
  DUFFEL: {
    type: "DUFFEL",
    name: "Duffel",
    category: "FLIGHTS",
    description: "Modern flight API — search, book, and manage NDC content.",
    authType: "API_KEY",
    credentialTypes: ["API_KEY"],
    sandboxUrl: "https://api.duffel.com",
    productionUrl: "https://api.duffel.com",
    capabilities: ["flight_search", "flight_booking", "seat_maps"],
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
  },
};

export const PROVIDER_TYPES = Object.keys(PROVIDER_REGISTRY) as ProviderType[];

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
