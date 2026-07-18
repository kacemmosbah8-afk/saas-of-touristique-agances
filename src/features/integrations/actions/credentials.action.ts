"use server";

import type { ProviderCredentialType } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { encryptSecret } from "@/shared/lib/crypto/encryption";
import { env } from "@/shared/config/env";
import type { TenantDb } from "@/shared/lib/db";
import { ensureProviderRecord } from "@/features/integrations/lib/provider-record";
import type { IntegrationType } from "@/features/integrations/lib/registry";
import {
  connectProviderSchema,
  integrationTypeSchema,
  type ConnectProviderInput,
  type IntegrationTypeInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * Upsert one encrypted credential row on a connection. Plaintext is encrypted
 * with AES-256-GCM and never persisted or logged.
 */
async function saveSecret(
  db: TenantDb,
  tenantId: string,
  connectionId: string,
  type: ProviderCredentialType,
  value: string,
) {
  const encrypted = encryptSecret(value);
  await db.providerCredential.upsert({
    where: { connectionId_type: { connectionId, type } },
    create: { tenantId, connectionId, type, ...encrypted },
    update: encrypted,
  });
}

async function getConnectionId(db: TenantDb, tenantId: string, type: IntegrationType) {
  const providerId = await ensureProviderRecord(db, tenantId, type);
  const connection = await db.providerConnection.findFirst({
    where: { providerId, tenantId },
    select: { id: true },
  });
  return { providerId, connectionId: connection?.id ?? null };
}

/**
 * Connect (or rotate credentials for) a provider using this tenant's own
 * account. Persists encrypted credentials and marks the connection PENDING so
 * the next Test Connection reflects the new keys. This is the write half of
 * the multi-tenant credential system: Agency A and Agency B store completely
 * independent credential rows on their own Provider records.
 */
export async function connectProviderAction(
  tenantId: string,
  input: ConnectProviderInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = connectProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }
  const data = parsed.data;

  const { providerId, connectionId } = await getConnectionId(db, tenantId, data.type);
  if (!connectionId) return { ok: false, error: "Provider connection not found." };

  const savedTypes: ProviderCredentialType[] = [];

  if (data.type === "HOTELBEDS") {
    await saveSecret(db, tenantId, connectionId, "API_KEY", data.apiKey);
    await saveSecret(db, tenantId, connectionId, "API_SECRET", data.apiSecret);
    savedTypes.push("API_KEY", "API_SECRET");
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: {
        environment: data.environment === "live" ? "PRODUCTION" : "SANDBOX",
        authType: "API_KEY",
        status: "PENDING",
        baseUrl:
          data.environment === "live"
            ? "https://api.hotelbeds.com"
            : "https://api.test.hotelbeds.com",
      },
    });
  } else if (data.type === "AMADEUS") {
    await saveSecret(db, tenantId, connectionId, "API_KEY", data.clientId);
    await saveSecret(db, tenantId, connectionId, "API_SECRET", data.clientSecret);
    savedTypes.push("API_KEY", "API_SECRET");
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: { authType: "OAUTH", status: "PENDING" },
    });
  } else {
    await saveSecret(db, tenantId, connectionId, "API_KEY", data.token);
    savedTypes.push("API_KEY");
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: {
        authType: "API_KEY",
        status: "PENDING",
        baseUrl: "https://engine.hotellook.com",
      },
    });
  }

  await db.providerLog.create({
    data: {
      tenantId,
      providerId,
      level: "INFO",
      message: `Credentials saved (${savedTypes.join(", ")}) for this agency's own account`,
    },
  });

  // Audit records which credential types were saved — never the values.
  await writeAudit(db, {
    userId: session.user.id,
    action: "connect-provider",
    entity: "provider",
    entityId: providerId,
    metadata: { type: data.type, credentialTypes: savedTypes },
  });

  logger.info("provider credentials saved", { tenantId, type: data.type });
  return { ok: true };
}

/** Remove this tenant's stored credentials for a provider. */
export async function disconnectProviderCredentialsAction(
  tenantId: string,
  input: IntegrationTypeInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = integrationTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid integration." };

  const { providerId, connectionId } = await getConnectionId(db, tenantId, parsed.data.type);
  if (!connectionId) return { ok: false, error: "Provider connection not found." };

  await db.providerCredential.deleteMany({ where: { connectionId, tenantId } });
  await db.providerConnection.update({
    where: { id: connectionId, tenantId },
    data: { status: "DISCONNECTED", lastConnectedAt: null },
  });
  await db.providerHealth.updateMany({
    where: { providerId },
    data: { status: "UNKNOWN", message: "Credentials removed", latencyMs: null },
  });
  await db.providerLog.create({
    data: { tenantId, providerId, level: "WARN", message: "Credentials removed for this agency" },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "disconnect-provider",
    entity: "provider",
    entityId: providerId,
    metadata: { type: parsed.data.type },
  });
  return { ok: true };
}

/**
 * Migration helper: copy the platform's environment credentials into this
 * tenant's encrypted store as a starting point, so an agency running on the
 * shared development keys can move to its own managed credentials in one
 * click and then rotate them. Only available while env fallback exists.
 */
export async function importEnvCredentialsAction(
  tenantId: string,
  input: IntegrationTypeInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = integrationTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid integration." };
  const type = parsed.data.type;

  const { providerId, connectionId } = await getConnectionId(db, tenantId, type);
  if (!connectionId) return { ok: false, error: "Provider connection not found." };

  let imported = false;

  if (type === "HOTELBEDS" && env.HOTELBEDS_HOTEL_API_KEY && env.HOTELBEDS_HOTEL_SECRET) {
    await saveSecret(db, tenantId, connectionId, "API_KEY", env.HOTELBEDS_HOTEL_API_KEY);
    await saveSecret(db, tenantId, connectionId, "API_SECRET", env.HOTELBEDS_HOTEL_SECRET);
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: {
        environment: env.HOTELBEDS_ENVIRONMENT === "live" ? "PRODUCTION" : "SANDBOX",
        authType: "API_KEY",
        status: "PENDING",
        baseUrl:
          env.HOTELBEDS_ENVIRONMENT === "live"
            ? "https://api.hotelbeds.com"
            : "https://api.test.hotelbeds.com",
      },
    });
    imported = true;
  } else if (type === "AMADEUS" && env.AMADEUS_CLIENT_ID && env.AMADEUS_CLIENT_SECRET) {
    await saveSecret(db, tenantId, connectionId, "API_KEY", env.AMADEUS_CLIENT_ID);
    await saveSecret(db, tenantId, connectionId, "API_SECRET", env.AMADEUS_CLIENT_SECRET);
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: { authType: "OAUTH", status: "PENDING" },
    });
    imported = true;
  } else if (type === "TRAVELPAYOUTS" && env.TRAVELPAYOUTS_TOKEN) {
    await saveSecret(db, tenantId, connectionId, "API_KEY", env.TRAVELPAYOUTS_TOKEN);
    await db.providerConnection.update({
      where: { id: connectionId, tenantId },
      data: { authType: "API_KEY", status: "PENDING", baseUrl: "https://engine.hotellook.com" },
    });
    imported = true;
  }

  if (!imported) {
    return { ok: false, error: "No platform credentials are available to import for this provider." };
  }

  await db.providerLog.create({
    data: {
      tenantId,
      providerId,
      level: "INFO",
      message: "Imported platform credentials into this agency's encrypted store",
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "import-env-credentials",
    entity: "provider",
    entityId: providerId,
    metadata: { type },
  });
  return { ok: true };
}
