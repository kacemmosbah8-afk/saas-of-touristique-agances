"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  leadFormSchema,
  updateLeadStageSchema,
  assignLeadSchema,
  convertLeadSchema,
  LEAD_STAGE_LABELS,
  type LeadFormInput,
  type UpdateLeadStageInput,
  type AssignLeadInput,
  type ConvertLeadInput,
} from "@/features/leads/schemas/lead.schema";
import type { ActionResult } from "@/shared/types/action-result";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toData(d: LeadFormInput) {
  return {
    title: d.title,
    contactName: d.contactName,
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    source: d.source || null,
    ownerId: emptyToNull(d.ownerId),
    estimatedValue: d.estimatedValue ?? null,
    currency: d.currency,
    expectedCloseDate: parseDate(d.expectedCloseDate || undefined),
    notes: emptyToNull(d.notes),
  };
}

export async function createLeadAction(
  tenantId: string,
  input: LeadFormInput,
): Promise<ActionResult<{ leadId: string }>> {
  const { session, db } = await requirePermission(tenantId, "lead", "create");

  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const lead = await db.lead.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await db.leadActivity.create({
    data: {
      tenantId,
      leadId: lead.id,
      userId: session.user.id,
      type: "CREATED",
      title: "Lead created",
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "lead",
    entityId: lead.id,
    metadata: { title: parsed.data.title },
  });
  logger.info("lead created", { tenantId, leadId: lead.id });
  return { ok: true, data: { leadId: lead.id } };
}

export async function updateLeadAction(
  tenantId: string,
  leadId: string,
  input: LeadFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");

  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.lead.update({ where: { id: leadId, tenantId }, data: toData(parsed.data) });
  } catch {
    return { ok: false, error: "Lead not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "lead",
    entityId: leadId,
  });
  return { ok: true };
}

export async function updateLeadStageAction(
  tenantId: string,
  leadId: string,
  input: UpdateLeadStageInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");

  const parsed = updateLeadStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stage." };

  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId },
    select: { stage: true },
  });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.stage === parsed.data.stage) return { ok: true };

  await db.lead.update({
    where: { id: leadId, tenantId },
    data: {
      stage: parsed.data.stage,
      lostReason:
        parsed.data.stage === "LOST" ? (parsed.data.lostReason?.trim() || null) : null,
    },
  });

  await db.leadActivity.create({
    data: {
      tenantId,
      leadId,
      userId: session.user.id,
      type: "STAGE_CHANGED",
      title: `Stage: ${LEAD_STAGE_LABELS[lead.stage]} → ${LEAD_STAGE_LABELS[parsed.data.stage]}`,
      description: parsed.data.stage === "LOST" ? parsed.data.lostReason || null : null,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "stage",
    entity: "lead",
    entityId: leadId,
    metadata: { from: lead.stage, to: parsed.data.stage },
  });
  return { ok: true };
}

export async function assignLeadAction(
  tenantId: string,
  leadId: string,
  input: AssignLeadInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");

  const parsed = assignLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const ownerId = emptyToNull(parsed.data.ownerId);

  // Owner must be an active member of this tenant.
  if (ownerId) {
    const membership = await db.membership.findFirst({
      where: { userId: ownerId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!membership) return { ok: false, error: "Owner is not a member of this workspace." };
  }

  try {
    await db.lead.update({ where: { id: leadId, tenantId }, data: { ownerId } });
  } catch {
    return { ok: false, error: "Lead not found." };
  }

  await db.leadActivity.create({
    data: {
      tenantId,
      leadId,
      userId: session.user.id,
      type: "ASSIGNED",
      title: ownerId ? "Lead assigned" : "Lead unassigned",
      metadata: { ownerId },
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "assign",
    entity: "lead",
    entityId: leadId,
    metadata: { ownerId },
  });
  return { ok: true };
}

/**
 * Convert a lead to a customer. Creates a new customer from the lead's
 * contact info (or links an existing one), marks the lead WON + converted,
 * and writes timeline entries on both sides.
 */
export async function convertLeadAction(
  tenantId: string,
  leadId: string,
  input: ConvertLeadInput,
): Promise<ActionResult<{ customerId: string }>> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");

  const parsed = convertLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId, deletedAt: null },
    select: {
      contactName: true,
      email: true,
      phone: true,
      source: true,
      ownerId: true,
      convertedAt: true,
      title: true,
    },
  });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.convertedAt) return { ok: false, error: "Lead is already converted." };

  let customerId: string;

  if (parsed.data.existingCustomerId) {
    const existing = await db.customer.findFirst({
      where: { id: parsed.data.existingCustomerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Customer not found." };
    customerId = existing.id;
  } else {
    const nameParts = lead.contactName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? lead.contactName;
    const lastName = nameParts.slice(1).join(" ") || "—";

    const customer = await db.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email: lead.email,
        phone: lead.phone,
        leadSource: lead.source,
        ownerId: lead.ownerId,
      },
      select: { id: true },
    });
    customerId = customer.id;

    await db.customerActivity.create({
      data: {
        tenantId,
        customerId,
        userId: session.user.id,
        type: "CREATED",
        title: "Customer created from lead",
        description: lead.title,
      },
    });
  }

  await db.lead.update({
    where: { id: leadId, tenantId },
    data: { customerId, convertedAt: new Date(), stage: "WON" },
  });

  await db.leadActivity.create({
    data: {
      tenantId,
      leadId,
      userId: session.user.id,
      type: "CONVERTED",
      title: "Converted to customer",
      metadata: { customerId },
    },
  });
  await db.customerActivity.create({
    data: {
      tenantId,
      customerId,
      userId: session.user.id,
      type: "CONVERTED",
      title: `Lead “${lead.title}” won`,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "convert",
    entity: "lead",
    entityId: leadId,
    metadata: { customerId },
  });
  logger.info("lead converted", { tenantId, leadId, customerId });
  return { ok: true, data: { customerId } };
}

export async function deleteLeadAction(
  tenantId: string,
  leadId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "delete");

  try {
    await db.lead.update({
      where: { id: leadId, tenantId },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { ok: false, error: "Lead not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "lead",
    entityId: leadId,
  });
  logger.info("lead deleted", { tenantId, leadId });
  return { ok: true };
}
