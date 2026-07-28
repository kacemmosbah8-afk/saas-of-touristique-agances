"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  guideFormSchema,
  updateGuideStatusSchema,
  type GuideFormInput,
  type UpdateGuideStatusInput,
} from "@/features/guides/schemas/guide.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: GuideFormInput) {
  return {
    name: d.name,
    languages: d.languages ?? [],
    certifications: d.certifications ?? [],
    experienceYears: numOrNull(d.experienceYears),
    dailyRate: d.dailyRate ?? null,
    currency: d.currency,
    country: emptyToNull(d.country),
    city: emptyToNull(d.city),
    contactEmail: emptyToNull(d.contactEmail),
    contactPhone: emptyToNull(d.contactPhone),
    availabilityNotes: emptyToNull(d.availabilityNotes),
    internalNotes: emptyToNull(d.internalNotes),
  };
}

export async function createGuideAction(
  tenantId: string,
  input: GuideFormInput,
): Promise<ActionResult<{ guideId: string }>> {
  const { session, db } = await requirePermission(tenantId, "guide", "create");

  const parsed = guideFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const guide = await db.guide.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "guide",
    entityId: guide.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("guide created", { tenantId, guideId: guide.id });
  return { ok: true, data: { guideId: guide.id } };
}

export async function updateGuideAction(
  tenantId: string,
  guideId: string,
  input: GuideFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "guide", "update");

  const parsed = guideFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.guide.update({ where: { id: guideId, tenantId }, data: toData(parsed.data) });
  } catch {
    return { ok: false, error: "Guide not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "guide",
    entityId: guideId,
  });
  return { ok: true };
}

export async function updateGuideStatusAction(
  tenantId: string,
  guideId: string,
  input: UpdateGuideStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "guide", "manage");

  const parsed = updateGuideStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.guide.update({
      where: { id: guideId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Guide not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "guide",
    entityId: guideId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteGuideAction(
  tenantId: string,
  guideId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "guide", "delete");

  try {
    await db.guide.update({
      where: { id: guideId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Guide not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "guide",
    entityId: guideId,
  });
  logger.info("guide deleted", { tenantId, guideId });
  return { ok: true };
}
