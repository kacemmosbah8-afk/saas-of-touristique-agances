"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  supplierContactSchema,
  type SupplierContactInput,
} from "@/features/suppliers/schemas/supplier.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: SupplierContactInput) {
  return {
    name: d.name,
    role: emptyToNull(d.role),
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    isPrimary: d.isPrimary ?? false,
  };
}

export async function addSupplierContactAction(
  tenantId: string,
  supplierId: string,
  input: SupplierContactInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  const parsed = supplierContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: { id: true },
  });
  if (!supplier) return { ok: false, error: "Supplier not found." };

  if (parsed.data.isPrimary) {
    await db.supplierContact.updateMany({ where: { supplierId }, data: { isPrimary: false } });
  }

  await db.supplierContact.create({
    data: { tenantId, supplierId, ...toData(parsed.data) },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-contact",
    entity: "supplier",
    entityId: supplierId,
  });
  return { ok: true };
}

export async function updateSupplierContactAction(
  tenantId: string,
  contactId: string,
  input: SupplierContactInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  const parsed = supplierContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const contact = await db.supplierContact.findFirst({
    where: { id: contactId, tenantId },
    select: { supplierId: true },
  });
  if (!contact) return { ok: false, error: "Contact not found." };

  if (parsed.data.isPrimary) {
    await db.supplierContact.updateMany({
      where: { supplierId: contact.supplierId, id: { not: contactId } },
      data: { isPrimary: false },
    });
  }

  await db.supplierContact.update({
    where: { id: contactId, tenantId },
    data: toData(parsed.data),
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-contact",
    entity: "supplier",
    entityId: contactId,
  });
  return { ok: true };
}

export async function deleteSupplierContactAction(
  tenantId: string,
  contactId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  try {
    await db.supplierContact.delete({ where: { id: contactId, tenantId } });
  } catch {
    return { ok: false, error: "Contact not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-contact",
    entity: "supplier",
    entityId: contactId,
  });
  return { ok: true };
}
