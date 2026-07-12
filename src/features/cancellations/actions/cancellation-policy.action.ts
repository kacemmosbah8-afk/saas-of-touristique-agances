"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import {
  cancellationPolicyFormSchema,
  assignPolicySchema,
  type CancellationPolicyFormInput,
  type AssignPolicyInput,
} from "@/features/cancellations/schemas/cancellation.schema";

/**
 * Cancellation policies are workspace configuration, so they ride the
 * `settings` resource: OWNER/ADMIN manage them, everyone with settings:view
 * can read them.
 */

export async function createCancellationPolicyAction(
  tenantId: string,
  input: CancellationPolicyFormInput,
): Promise<ActionResult<{ policyId: string }>> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = cancellationPolicyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid policy." };
  }

  // A new default unsets the previous one.
  if (parsed.data.isDefault) {
    await db.cancellationPolicy.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const policy = await db.cancellationPolicy.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      isDefault: parsed.data.isDefault ?? false,
      rules: {
        create: parsed.data.rules.map((r) => ({
          tenantId,
          daysBefore: r.daysBefore,
          penaltyType: r.penaltyType,
          penaltyValue: r.penaltyValue,
        })),
      },
    },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "cancellation_policy",
    entityId: policy.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("cancellation policy created", { tenantId, policyId: policy.id });
  return { ok: true, data: { policyId: policy.id } };
}

export async function updateCancellationPolicyAction(
  tenantId: string,
  policyId: string,
  input: CancellationPolicyFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = cancellationPolicyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid policy." };
  }

  const existing = await db.cancellationPolicy.findFirst({
    where: { id: policyId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Policy not found." };

  if (parsed.data.isDefault) {
    await db.cancellationPolicy.updateMany({
      where: { isDefault: true, id: { not: policyId } },
      data: { isDefault: false },
    });
  }

  // Tiers are replaced wholesale — historical cancellations snapshot the
  // tier they applied, so rewriting the live set is safe.
  await db.cancellationPolicyRule.deleteMany({ where: { policyId } });
  await db.cancellationPolicy.update({
    where: { id: policyId, tenantId },
    data: {
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      isDefault: parsed.data.isDefault ?? false,
      rules: {
        create: parsed.data.rules.map((r) => ({
          tenantId,
          daysBefore: r.daysBefore,
          penaltyType: r.penaltyType,
          penaltyValue: r.penaltyValue,
        })),
      },
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "cancellation_policy",
    entityId: policyId,
  });
  return { ok: true };
}

export async function deleteCancellationPolicyAction(
  tenantId: string,
  policyId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const existing = await db.cancellationPolicy.findFirst({
    where: { id: policyId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Policy not found." };

  await db.cancellationPolicy.update({
    where: { id: policyId, tenantId },
    data: { deletedAt: new Date(), isDefault: false },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "cancellation_policy",
    entityId: policyId,
  });
  logger.info("cancellation policy deleted", { tenantId, policyId });
  return { ok: true };
}

/** Attach/detach a policy on a booking (booking-level permission, not
 * settings — agents assign policies, admins define them). */
export async function assignCancellationPolicyAction(
  tenantId: string,
  bookingId: string,
  input: AssignPolicyInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = assignPolicySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking's policy can't be changed." };
  }

  const policyId = emptyToNull(parsed.data.policyId);
  if (policyId) {
    const policy = await db.cancellationPolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!policy) return { ok: false, error: "Policy not found." };
  }

  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: { cancellationPolicyId: policyId },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: policyId ? "Cancellation policy assigned" : "Cancellation policy removed",
      metadata: { policyId },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "assign_cancellation_policy",
    entity: "booking",
    entityId: bookingId,
    metadata: { policyId },
  });
  return { ok: true };
}
