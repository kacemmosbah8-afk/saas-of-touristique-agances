"use server";

import type { ProviderLogLevel } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { encryptSecret, decryptSecret } from "@/shared/lib/crypto/encryption";
import type { TenantDb } from "@/shared/lib/db";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";
import { getProviderAdapter } from "@/features/providers/lib/provider-adapter";
import {
  enableProviderSchema,
  updateConnectionSchema,
  saveCredentialSchema,
  webhookSchema,
  type EnableProviderInput,
  type UpdateConnectionInput,
  type SaveCredentialInput,
  type WebhookInput,
} from "@/features/providers/schemas/provider.schema";
import type { ActionResult } from "@/shared/types/action-result";

async function logProvider(
  db: TenantDb,
  tenantId: string,
  providerId: string,
  level: ProviderLogLevel,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await db.providerLog.create({
    data: {
      tenantId,
      providerId,
      level,
      message,
      metadata: metadata as never,
    },
  });
}

/** Decrypt every credential on a connection into a { TYPE: value } map. */
async function loadCredentials(
  db: TenantDb,
  connectionId: string,
): Promise<Record<string, string>> {
  const rows = await db.providerCredential.findMany({ where: { connectionId } });
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.type] = decryptSecret({
      encryptedValue: row.encryptedValue,
      iv: row.iv,
      authTag: row.authTag,
    });
  }
  return out;
}

/**
 * Enable a provider for this tenant: creates the Provider row plus its
 * connection, default capabilities, and health record. Idempotent per
 * (tenant, type) via the unique constraint.
 */
export async function enableProviderAction(
  tenantId: string,
  input: EnableProviderInput,
): Promise<ActionResult<{ providerId: string }>> {
  const { session, db } = await requirePermission(tenantId, "provider", "create");

  const parsed = enableProviderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid provider type." };
  const meta = PROVIDER_REGISTRY[parsed.data.type];

  if (meta.status !== "live") {
    return { ok: false, error: `${meta.name} isn't available to connect yet.` };
  }

  const existing = await db.provider.findFirst({
    where: { type: parsed.data.type },
    select: { id: true, deletedAt: true },
  });

  let providerId: string;
  if (existing) {
    // Re-enable a previously removed provider instead of violating the unique.
    await db.provider.update({
      where: { id: existing.id, tenantId },
      data: { enabled: true, deletedAt: null },
    });
    providerId = existing.id;
  } else {
    const provider = await db.provider.create({
      data: {
        tenantId,
        type: meta.type,
        name: meta.name,
        description: meta.description,
        enabled: true,
        connection: {
          create: {
            tenantId,
            environment: "SANDBOX",
            authType: meta.authType,
            baseUrl: meta.sandboxUrl,
          },
        },
        capabilities: {
          create: meta.capabilities.map((name) => ({ tenantId, name })),
        },
        health: { create: { tenantId, status: "UNKNOWN" } },
        rateLimit: { create: { tenantId } },
      },
      select: { id: true },
    });
    providerId = provider.id;
  }

  await logProvider(db, tenantId, providerId, "INFO", `${meta.name} enabled`);
  await writeAudit(db, {
    userId: session.user.id,
    action: "enable",
    entity: "provider",
    entityId: providerId,
    metadata: { type: meta.type },
  });
  logger.info("provider enabled", { tenantId, providerId, type: meta.type });
  return { ok: true, data: { providerId } };
}

export async function updateProviderConnectionAction(
  tenantId: string,
  providerId: string,
  input: UpdateConnectionInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  const parsed = updateConnectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    select: { type: true, connection: { select: { id: true } } },
  });
  if (!provider?.connection) return { ok: false, error: "Provider not found." };

  const meta = PROVIDER_REGISTRY[provider.type];
  const baseUrl =
    emptyToNull(parsed.data.baseUrl) ??
    (parsed.data.environment === "PRODUCTION" ? meta.productionUrl : meta.sandboxUrl);

  await db.providerConnection.update({
    where: { id: provider.connection.id, tenantId },
    data: {
      environment: parsed.data.environment,
      authType: parsed.data.authType,
      baseUrl,
      autoReconnect: parsed.data.autoReconnect,
      // Environment/auth changes invalidate the previous verification.
      status: "PENDING",
    },
  });

  await logProvider(
    db,
    tenantId,
    providerId,
    "INFO",
    `Connection settings updated (${parsed.data.environment.toLowerCase()})`,
  );
  await writeAudit(db, {
    userId: session.user.id,
    action: "update-connection",
    entity: "provider",
    entityId: providerId,
    metadata: { environment: parsed.data.environment },
  });
  return { ok: true };
}

export async function saveProviderCredentialAction(
  tenantId: string,
  providerId: string,
  input: SaveCredentialInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = saveCredentialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    select: { connection: { select: { id: true } } },
  });
  if (!provider?.connection) return { ok: false, error: "Provider not found." };

  const encrypted = encryptSecret(parsed.data.value);
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

  await db.providerCredential.upsert({
    where: {
      connectionId_type: {
        connectionId: provider.connection.id,
        type: parsed.data.type,
      },
    },
    create: {
      tenantId,
      connectionId: provider.connection.id,
      type: parsed.data.type,
      ...encrypted,
      expiresAt,
    },
    update: { ...encrypted, expiresAt },
  });

  await logProvider(db, tenantId, providerId, "INFO", `Credential ${parsed.data.type} saved`);
  // Deliberately no credential material in the audit trail — type only.
  await writeAudit(db, {
    userId: session.user.id,
    action: "save-credential",
    entity: "provider",
    entityId: providerId,
    metadata: { credentialType: parsed.data.type },
  });
  return { ok: true };
}

export async function deleteProviderCredentialAction(
  tenantId: string,
  credentialId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  try {
    await db.providerCredential.delete({ where: { id: credentialId, tenantId } });
  } catch {
    return { ok: false, error: "Credential not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-credential",
    entity: "provider",
    entityId: credentialId,
  });
  return { ok: true };
}

/**
 * Test the provider connection. Runs the adapter's offline validation, then
 * records health, connection status, and a log entry. Handles token
 * expiration: an expired token flips the connection to EXPIRED unless
 * auto-reconnect is on, in which case the test proceeds and logs the
 * reconnect attempt.
 */
export async function testProviderConnectionAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult<{ ok: boolean; latencyMs: number; message: string }>> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    include: { connection: true },
  });
  if (!provider?.connection) return { ok: false, error: "Provider not found." };
  const connection = provider.connection;

  // Token expiration handling.
  const tokenExpired =
    connection.tokenExpiresAt != null && connection.tokenExpiresAt < new Date();
  if (tokenExpired && !connection.autoReconnect) {
    await db.providerConnection.update({
      where: { id: connection.id, tenantId },
      data: { status: "EXPIRED" },
    });
    await logProvider(db, tenantId, providerId, "WARN", "Token expired; auto-reconnect is off");
    return {
      ok: true,
      data: { ok: false, latencyMs: 0, message: "Token expired. Enable auto-reconnect or refresh credentials." },
    };
  }
  if (tokenExpired) {
    await logProvider(db, tenantId, providerId, "INFO", "Token expired; attempting automatic reconnect");
  }

  const credentials = await loadCredentials(db, connection.id);
  const adapter = getProviderAdapter(provider.type);
  const result = await adapter.testConnection(credentials, connection.baseUrl ?? "");

  await Promise.all([
    db.providerConnection.update({
      where: { id: connection.id, tenantId },
      data: {
        status: result.ok ? "CONNECTED" : "ERROR",
        lastConnectedAt: result.ok ? new Date() : connection.lastConnectedAt,
      },
    }),
    db.providerHealth.upsert({
      where: { providerId },
      create: {
        tenantId,
        providerId,
        status: result.ok ? "HEALTHY" : "DOWN",
        latencyMs: result.latencyMs,
        lastCheckedAt: new Date(),
        message: result.message,
      },
      update: {
        status: result.ok ? "HEALTHY" : "DOWN",
        latencyMs: result.latencyMs,
        lastCheckedAt: new Date(),
        message: result.message,
      },
    }),
  ]);

  await logProvider(
    db,
    tenantId,
    providerId,
    result.ok ? "INFO" : "ERROR",
    `Connection test ${result.ok ? "passed" : "failed"}: ${result.message}`,
    { latencyMs: result.latencyMs },
  );

  if (!result.ok) {
    await db.providerError.create({
      data: { tenantId, providerId, code: "CONNECTION_TEST", message: result.message },
    });
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "test-connection",
    entity: "provider",
    entityId: providerId,
    metadata: { ok: result.ok },
  });
  return { ok: true, data: result };
}

/** Run a (offline) sync through the adapter, recording a ProviderSync row. */
export async function runProviderSyncAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    include: { connection: true },
  });
  if (!provider?.connection) return { ok: false, error: "Provider not found." };

  const sync = await db.providerSync.create({
    data: { tenantId, providerId, status: "RUNNING" },
    select: { id: true },
  });

  const credentials = await loadCredentials(db, provider.connection.id);
  const adapter = getProviderAdapter(provider.type);
  const result = await adapter.sync(credentials, provider.connection.baseUrl ?? "");

  await Promise.all([
    db.providerSync.update({
      where: { id: sync.id, tenantId },
      data: {
        status: result.ok ? "SUCCESS" : "FAILED",
        finishedAt: new Date(),
        recordsProcessed: result.recordsProcessed,
        error: result.ok ? null : result.message,
      },
    }),
    result.ok
      ? db.providerConnection.update({
          where: { id: provider.connection.id, tenantId },
          data: { lastSyncAt: new Date() },
        })
      : Promise.resolve(),
  ]);

  await logProvider(
    db,
    tenantId,
    providerId,
    result.ok ? "INFO" : "ERROR",
    `Sync ${result.ok ? "completed" : "failed"}: ${result.message}`,
  );
  await writeAudit(db, {
    userId: session.user.id,
    action: "sync",
    entity: "provider",
    entityId: providerId,
    metadata: { ok: result.ok },
  });
  return { ok: true };
}

export async function toggleProviderCapabilityAction(
  tenantId: string,
  capabilityId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  try {
    await db.providerCapability.update({
      where: { id: capabilityId, tenantId },
      data: { enabled },
    });
  } catch {
    return { ok: false, error: "Capability not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: enabled ? "enable-capability" : "disable-capability",
    entity: "provider",
    entityId: capabilityId,
  });
  return { ok: true };
}

export async function addProviderWebhookAction(
  tenantId: string,
  providerId: string,
  input: WebhookInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!provider) return { ok: false, error: "Provider not found." };

  await db.providerWebhook.create({
    data: {
      tenantId,
      providerId,
      event: parsed.data.event,
      url: parsed.data.url,
      secret: emptyToNull(parsed.data.secret),
    },
  });

  await logProvider(db, tenantId, providerId, "INFO", `Webhook registered: ${parsed.data.event}`);
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-webhook",
    entity: "provider",
    entityId: providerId,
    metadata: { event: parsed.data.event },
  });
  return { ok: true };
}

export async function deleteProviderWebhookAction(
  tenantId: string,
  webhookId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  try {
    await db.providerWebhook.delete({ where: { id: webhookId, tenantId } });
  } catch {
    return { ok: false, error: "Webhook not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-webhook",
    entity: "provider",
    entityId: webhookId,
  });
  return { ok: true };
}

export async function resolveProviderErrorAction(
  tenantId: string,
  errorId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  try {
    await db.providerError.update({
      where: { id: errorId, tenantId },
      data: { resolved: true },
    });
  } catch {
    return { ok: false, error: "Error record not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "resolve-error",
    entity: "provider",
    entityId: errorId,
  });
  return { ok: true };
}

export async function disconnectProviderAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const provider = await db.provider.findFirst({
    where: { id: providerId, tenantId, deletedAt: null },
    select: { connection: { select: { id: true } } },
  });
  if (!provider?.connection) return { ok: false, error: "Provider not found." };

  await db.providerConnection.update({
    where: { id: provider.connection.id, tenantId },
    data: { status: "DISCONNECTED" },
  });

  await logProvider(db, tenantId, providerId, "WARN", "Provider disconnected");
  await writeAudit(db, {
    userId: session.user.id,
    action: "disconnect",
    entity: "provider",
    entityId: providerId,
  });
  return { ok: true };
}

/** Soft-remove the provider (kept for audit; can be re-enabled later). */
export async function removeProviderAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "delete");

  try {
    await db.provider.update({
      where: { id: providerId, tenantId },
      data: { enabled: false, deletedAt: new Date() },
    });
  } catch {
    return { ok: false, error: "Provider not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "provider",
    entityId: providerId,
  });
  logger.info("provider removed", { tenantId, providerId });
  return { ok: true };
}
