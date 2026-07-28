"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  transportFormSchema,
  updateTransportStatusSchema,
  type TransportFormInput,
  type UpdateTransportStatusInput,
} from "@/features/transport/schemas/transport.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: TransportFormInput) {
  return {
    name: d.name,
    type: d.type,
    country: emptyToNull(d.country),
    city: emptyToNull(d.city),
    contactName: emptyToNull(d.contactName),
    contactEmail: emptyToNull(d.contactEmail),
    contactPhone: emptyToNull(d.contactPhone),
    website: emptyToNull(d.website),
    fleetNotes: emptyToNull(d.fleetNotes),
    pricingNotes: emptyToNull(d.pricingNotes),
    internalNotes: emptyToNull(d.internalNotes),
  };
}

export async function createTransportAction(
  tenantId: string,
  input: TransportFormInput,
): Promise<ActionResult<{ providerId: string }>> {
  const { session, db } = await requirePermission(tenantId, "transport", "create");

  const parsed = transportFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const provider = await db.transportProvider.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "transport_provider",
    entityId: provider.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("transport provider created", { tenantId, providerId: provider.id });
  return { ok: true, data: { providerId: provider.id } };
}

export async function updateTransportAction(
  tenantId: string,
  providerId: string,
  input: TransportFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "transport", "update");

  const parsed = transportFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.transportProvider.update({
      where: { id: providerId, tenantId },
      data: toData(parsed.data),
    });
  } catch {
    return { ok: false, error: "Provider not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "transport_provider",
    entityId: providerId,
  });
  return { ok: true };
}

export async function updateTransportStatusAction(
  tenantId: string,
  providerId: string,
  input: UpdateTransportStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "transport", "manage");

  const parsed = updateTransportStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.transportProvider.update({
      where: { id: providerId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Provider not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "transport_provider",
    entityId: providerId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteTransportAction(
  tenantId: string,
  providerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "transport", "delete");

  try {
    await db.transportProvider.update({
      where: { id: providerId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Provider not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "transport_provider",
    entityId: providerId,
  });
  logger.info("transport provider deleted", { tenantId, providerId });
  return { ok: true };
}
