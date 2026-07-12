"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  supplierFormSchema,
  updateSupplierStatusSchema,
  addSupplierDocumentSchema,
  type SupplierFormInput,
  type UpdateSupplierStatusInput,
  type AddSupplierDocumentInput,
} from "@/features/suppliers/schemas/supplier.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: SupplierFormInput) {
  return {
    name: d.name,
    type: d.type,
    contactName: emptyToNull(d.contactName),
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    website: emptyToNull(d.website),
    address: emptyToNull(d.address),
    country: emptyToNull(d.country),
    city: emptyToNull(d.city),
    paymentTerms: emptyToNull(d.paymentTerms),
    internalRating: numOrNull(d.internalRating),
    commissionRate: d.commissionRate ?? null,
    commissionNotes: emptyToNull(d.commissionNotes),
    notes: emptyToNull(d.notes),
  };
}

export async function createSupplierAction(
  tenantId: string,
  input: SupplierFormInput,
): Promise<ActionResult<{ supplierId: string }>> {
  const { session, db } = await requirePermission(tenantId, "supplier", "create");

  const parsed = supplierFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supplier = await db.supplier.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "supplier",
    entityId: supplier.id,
    metadata: { name: parsed.data.name, type: parsed.data.type },
  });
  logger.info("supplier created", { tenantId, supplierId: supplier.id });
  return { ok: true, data: { supplierId: supplier.id } };
}

export async function updateSupplierAction(
  tenantId: string,
  supplierId: string,
  input: SupplierFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  const parsed = supplierFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.supplier.update({ where: { id: supplierId, tenantId }, data: toData(parsed.data) });
  } catch {
    return { ok: false, error: "Supplier not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "supplier",
    entityId: supplierId,
  });
  return { ok: true };
}

export async function updateSupplierStatusAction(
  tenantId: string,
  supplierId: string,
  input: UpdateSupplierStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "manage");

  const parsed = updateSupplierStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.supplier.update({
      where: { id: supplierId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Supplier not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "supplier",
    entityId: supplierId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteSupplierAction(
  tenantId: string,
  supplierId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "delete");

  try {
    await db.supplier.update({
      where: { id: supplierId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Supplier not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "supplier",
    entityId: supplierId,
  });
  logger.info("supplier deleted", { tenantId, supplierId });
  return { ok: true };
}

export async function addSupplierDocumentAction(
  tenantId: string,
  supplierId: string,
  input: AddSupplierDocumentInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  const parsed = addSupplierDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid document." };

  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: { id: true },
  });
  if (!supplier) return { ok: false, error: "Supplier not found." };

  await db.supplierDocument.create({
    data: {
      tenantId,
      supplierId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-document",
    entity: "supplier",
    entityId: supplierId,
    metadata: { name: parsed.data.name },
  });
  return { ok: true };
}

export async function deleteSupplierDocumentAction(
  tenantId: string,
  documentId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "supplier", "update");

  try {
    await db.supplierDocument.delete({ where: { id: documentId, tenantId } });
  } catch {
    return { ok: false, error: "Document not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-document",
    entity: "supplier",
    entityId: documentId,
  });
  return { ok: true };
}
