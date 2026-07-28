"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  customerFormSchema,
  updateCustomerStatusSchema,
  duplicateCheckSchema,
  type CustomerFormInput,
  type UpdateCustomerStatusInput,
  type DuplicateCheckInput,
} from "@/features/crm/schemas/customer.schema";
import type { ActionResult } from "@/shared/types/action-result";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toData(d: CustomerFormInput) {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    type: d.type,
    leadSource: d.leadSource || null,
    communicationPreference: d.communicationPreference,
    dateOfBirth: parseDate(d.dateOfBirth || undefined),
    nationality: emptyToNull(d.nationality),
    passportNumber: emptyToNull(d.passportNumber),
    passportExpiry: parseDate(d.passportExpiry || undefined),
    ownerId: emptyToNull(d.ownerId),
    notes: emptyToNull(d.notes),
  };
}

export async function createCustomerAction(
  tenantId: string,
  input: CustomerFormInput,
): Promise<ActionResult<{ customerId: string }>> {
  const { session, db } = await requirePermission(tenantId, "customer", "create");

  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customer = await db.customer.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await db.customerActivity.create({
    data: {
      tenantId,
      customerId: customer.id,
      userId: session.user.id,
      type: "CREATED",
      title: "Customer created",
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "customer",
    entityId: customer.id,
    metadata: { name: `${parsed.data.firstName} ${parsed.data.lastName}` },
  });

  logger.info("customer created", { tenantId, customerId: customer.id });
  return { ok: true, data: { customerId: customer.id } };
}

export async function updateCustomerAction(
  tenantId: string,
  customerId: string,
  input: CustomerFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");

  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.customer.update({
      where: { id: customerId, tenantId },
      data: toData(parsed.data),
    });
  } catch {
    return { ok: false, error: "Customer not found." };
  }

  await db.customerActivity.create({
    data: {
      tenantId,
      customerId,
      userId: session.user.id,
      type: "UPDATED",
      title: "Customer updated",
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "customer",
    entityId: customerId,
  });
  return { ok: true };
}

export async function updateCustomerStatusAction(
  tenantId: string,
  customerId: string,
  input: UpdateCustomerStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");

  const parsed = updateCustomerStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.customer.update({
      where: { id: customerId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Customer not found." };
  }

  await db.customerActivity.create({
    data: {
      tenantId,
      customerId,
      userId: session.user.id,
      type: "STATUS_CHANGED",
      title: `Status changed to ${parsed.data.status.toLowerCase()}`,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "customer",
    entityId: customerId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteCustomerAction(
  tenantId: string,
  customerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "delete");

  try {
    await db.customer.update({
      where: { id: customerId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Customer not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "customer",
    entityId: customerId,
  });
  logger.info("customer deleted", { tenantId, customerId });
  return { ok: true };
}

export type DuplicateMatch = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

/** Find potential duplicate customers by email or phone (excludes deleted). */
export async function findCustomerDuplicatesAction(
  tenantId: string,
  input: DuplicateCheckInput,
): Promise<ActionResult<{ matches: DuplicateMatch[] }>> {
  const { db } = await requirePermission(tenantId, "customer", "view");

  const parsed = duplicateCheckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const email = parsed.data.email?.trim();
  const phone = parsed.data.phone?.trim();
  const or = [];
  if (email) or.push({ email: { equals: email, mode: "insensitive" as const } });
  if (phone) or.push({ phone });
  if (or.length === 0) return { ok: true, data: { matches: [] } };

  const matches = await db.customer.findMany({
    where: { deletedAt: null, OR: or },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    take: 5,
  });

  return {
    ok: true,
    data: {
      matches: matches.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        phone: m.phone,
      })),
    },
  };
}
