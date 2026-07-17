import type { ProviderCredentialType } from "@prisma/client";

import type { IntegrationType } from "@/features/integrations/lib/registry";

/**
 * Typed per-provider credential shapes and the field metadata that drives the
 * connection wizard. Each provider's secret fields map onto the existing
 * `ProviderCredential` rows (encrypted at rest); the Hotelbeds test/live
 * choice is stored on `ProviderConnection.environment`.
 */

export type DuffelCredentials = { token: string };
export type HotelbedsCredentials = {
  apiKey: string;
  secret: string;
  environment: "test" | "live";
};
export type AmadeusCredentials = { clientId: string; clientSecret: string };
/** A single bearer token — TravelPayouts' own auth model (X-Access-Token). */
export type TravelPayoutsCredentials = { token: string };

export type ProviderCredentials =
  | { type: "DUFFEL"; credentials: DuffelCredentials }
  | { type: "HOTELBEDS"; credentials: HotelbedsCredentials }
  | { type: "AMADEUS"; credentials: AmadeusCredentials }
  | { type: "TRAVELPAYOUTS"; credentials: TravelPayoutsCredentials };

/** Where a resolved set of credentials came from. */
export type CredentialSource = "tenant" | "environment";

/**
 * Descriptor for one secret field in the connection wizard. `credentialType`
 * is the `ProviderCredential.type` the value is persisted under.
 */
export type CredentialField = {
  key: string;
  label: string;
  credentialType: ProviderCredentialType;
  placeholder: string;
  help?: string;
};

export const PROVIDER_CREDENTIAL_FIELDS: Record<IntegrationType, CredentialField[]> = {
  DUFFEL: [
    {
      key: "token",
      label: "Access Token",
      credentialType: "OAUTH_TOKEN",
      placeholder: "duffel_test_… or duffel_live_…",
      help: "Duffel dashboard → Settings → Access tokens.",
    },
  ],
  HOTELBEDS: [
    {
      key: "apiKey",
      label: "API Key",
      credentialType: "API_KEY",
      placeholder: "Hotelbeds API key",
    },
    {
      key: "secret",
      label: "Secret",
      credentialType: "API_SECRET",
      placeholder: "Hotelbeds shared secret",
      help: "Used with the API key and a timestamp to compute the X-Signature.",
    },
  ],
  AMADEUS: [
    {
      key: "clientId",
      label: "Client ID",
      credentialType: "API_KEY",
      placeholder: "Amadeus API key (client_id)",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      credentialType: "API_SECRET",
      placeholder: "Amadeus API secret (client_secret)",
    },
  ],
  TRAVELPAYOUTS: [
    {
      key: "token",
      label: "API Token",
      credentialType: "API_KEY",
      placeholder: "TravelPayouts access token",
      help: "TravelPayouts dashboard → Developers → API tokens.",
    },
  ],
};

/** Does this provider expose a test/live environment toggle in the wizard? */
export function providerHasEnvironment(type: IntegrationType): boolean {
  return type === "HOTELBEDS";
}
