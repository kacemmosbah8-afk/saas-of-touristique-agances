import "server-only";
import type { ProviderCredentialType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { env } from "@/shared/config/env";
import { decryptSecret } from "@/shared/lib/crypto/encryption";
import type { IntegrationType } from "@/features/integrations/lib/registry";
import type {
  CredentialSource,
  ProviderCredentials,
} from "@/features/integrations/lib/credentials";

/**
 * Resolves the credentials to use for a tenant + provider. This is the single
 * point where TravelOS decides *whose* provider account a call runs against:
 *
 *   1. The tenant's own encrypted credentials (from ProviderConnection /
 *      ProviderCredential) — the true multi-tenant path. Each agency uses its
 *      own Duffel / Hotelbeds / Amadeus account.
 *   2. Only if the tenant has none, an optional platform-wide fallback from
 *      environment variables, clearly labelled `source: "environment"` so the
 *      UI can flag "shared/development credentials".
 *
 * When neither exists the provider is reported as not configured.
 */

export type ResolvedCredentials =
  | { configured: true; source: CredentialSource; provider: ProviderCredentials }
  | { configured: false; source: null; provider: null };

const NOT_CONFIGURED: ResolvedCredentials = {
  configured: false,
  source: null,
  provider: null,
};

/** Decrypt a connection's credential rows into a { TYPE: value } map. */
async function loadTenantSecrets(
  db: TenantDb,
  tenantId: string,
  type: IntegrationType,
): Promise<{ secrets: Map<ProviderCredentialType, string>; environment: "test" | "live" } | null> {
  const provider = await db.provider.findFirst({
    where: { type, tenantId, deletedAt: null },
    select: {
      connection: {
        select: {
          environment: true,
          credentials: { select: { type: true, encryptedValue: true, iv: true, authTag: true } },
        },
      },
    },
  });
  if (!provider?.connection) return null;

  const secrets = new Map<ProviderCredentialType, string>();
  for (const credential of provider.connection.credentials) {
    try {
      secrets.set(
        credential.type,
        decryptSecret({
          encryptedValue: credential.encryptedValue,
          iv: credential.iv,
          authTag: credential.authTag,
        }),
      );
    } catch {
      // A credential that fails to decrypt (e.g. after a key change) is
      // treated as absent rather than crashing the resolve.
    }
  }

  return {
    secrets,
    environment: provider.connection.environment === "PRODUCTION" ? "live" : "test",
  };
}

function buildFromTenant(
  type: IntegrationType,
  secrets: Map<ProviderCredentialType, string>,
  environment: "test" | "live",
): ProviderCredentials | null {
  switch (type) {
    case "DUFFEL": {
      const token = secrets.get("OAUTH_TOKEN") ?? secrets.get("API_KEY");
      return token ? { type: "DUFFEL", credentials: { token } } : null;
    }
    case "HOTELBEDS": {
      const apiKey = secrets.get("API_KEY");
      const secret = secrets.get("API_SECRET");
      return apiKey && secret
        ? { type: "HOTELBEDS", credentials: { apiKey, secret, environment } }
        : null;
    }
    case "AMADEUS": {
      const clientId = secrets.get("API_KEY");
      const clientSecret = secrets.get("API_SECRET");
      return clientId && clientSecret
        ? { type: "AMADEUS", credentials: { clientId, clientSecret } }
        : null;
    }
    case "TRAVELPAYOUTS": {
      const token = secrets.get("API_KEY");
      return token ? { type: "TRAVELPAYOUTS", credentials: { token } } : null;
    }
  }
}

function buildFromEnv(type: IntegrationType): ProviderCredentials | null {
  switch (type) {
    case "DUFFEL":
      return env.DUFFEL_TOKEN
        ? { type: "DUFFEL", credentials: { token: env.DUFFEL_TOKEN } }
        : null;
    case "HOTELBEDS":
      return env.HOTELBEDS_HOTEL_API_KEY && env.HOTELBEDS_HOTEL_SECRET
        ? {
            type: "HOTELBEDS",
            credentials: {
              apiKey: env.HOTELBEDS_HOTEL_API_KEY,
              secret: env.HOTELBEDS_HOTEL_SECRET,
              environment: env.HOTELBEDS_ENVIRONMENT,
            },
          }
        : null;
    case "AMADEUS":
      return env.AMADEUS_CLIENT_ID && env.AMADEUS_CLIENT_SECRET
        ? {
            type: "AMADEUS",
            credentials: {
              clientId: env.AMADEUS_CLIENT_ID,
              clientSecret: env.AMADEUS_CLIENT_SECRET,
            },
          }
        : null;
    case "TRAVELPAYOUTS":
      return env.TRAVELPAYOUTS_TOKEN
        ? { type: "TRAVELPAYOUTS", credentials: { token: env.TRAVELPAYOUTS_TOKEN } }
        : null;
  }
}

/**
 * Whether the platform provides env fallback credentials at all. In a strict
 * production SaaS this can be disabled entirely; keeping it lets local/dev and
 * the migration flow work while every tenant onboards its own account.
 */
const ALLOW_ENV_FALLBACK = true;

export async function resolveTenantCredentials(
  db: TenantDb,
  tenantId: string,
  type: IntegrationType,
): Promise<ResolvedCredentials> {
  const tenant = await loadTenantSecrets(db, tenantId, type);
  if (tenant) {
    const provider = buildFromTenant(type, tenant.secrets, tenant.environment);
    if (provider) return { configured: true, source: "tenant", provider };
  }

  if (ALLOW_ENV_FALLBACK) {
    const provider = buildFromEnv(type);
    if (provider) return { configured: true, source: "environment", provider };
  }

  return NOT_CONFIGURED;
}

/** Fast per-tenant "is this provider usable?" check for dashboards. */
export async function isProviderConfiguredForTenant(
  db: TenantDb,
  tenantId: string,
  type: IntegrationType,
): Promise<{ configured: boolean; source: CredentialSource | null }> {
  const resolved = await resolveTenantCredentials(db, tenantId, type);
  return { configured: resolved.configured, source: resolved.source };
}
