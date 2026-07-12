"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  customerNoteSchema,
  contactFormSchema,
  addressFormSchema,
  type CustomerNoteInput,
  type ContactFormInput,
  type AddressFormInput,
} from "@/features/crm/schemas/customer.schema";
import type { ActionResult } from "@/shared/types/action-result";

async function assertCustomer(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
  customerId: string,
) {
  return db.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
}

// --- Notes -----------------------------------------------------------------

export async function addCustomerNoteAction(
  tenantId: string,
  customerId: string,
  input: CustomerNoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  const parsed = customerNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!(await assertCustomer(db, tenantId, customerId))) {
    return { ok: false, error: "Customer not found." };
  }

  await db.customerNote.create({
    data: { tenantId, customerId, authorId: session.user.id, body: parsed.data.body },
  });
  await db.customerActivity.create({
    data: { tenantId, customerId, userId: session.user.id, type: "NOTE_ADDED", title: "Note added" },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-note",
    entity: "customer",
    entityId: customerId,
  });
  return { ok: true };
}

export async function deleteCustomerNoteAction(
  tenantId: string,
  noteId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  try {
    await db.customerNote.delete({ where: { id: noteId, tenantId } });
  } catch {
    return { ok: false, error: "Note not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-note",
    entity: "customer",
    entityId: noteId,
  });
  return { ok: true };
}

// --- Tags ------------------------------------------------------------------

export async function attachCustomerTagAction(
  tenantId: string,
  customerId: string,
  tagId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");

  const [customer, tag] = await Promise.all([
    assertCustomer(db, tenantId, customerId),
    db.tag.findFirst({ where: { id: tagId, tenantId }, select: { id: true, name: true } }),
  ]);
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!tag) return { ok: false, error: "Tag not found." };

  const existing = await db.customerTag.findFirst({
    where: { customerId, tagId },
    select: { id: true },
  });
  if (existing) return { ok: true };

  await db.customerTag.create({ data: { tenantId, customerId, tagId } });
  await db.customerActivity.create({
    data: {
      tenantId,
      customerId,
      userId: session.user.id,
      type: "TAG_ADDED",
      title: `Tagged “${tag.name}”`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "attach-tag",
    entity: "customer",
    entityId: customerId,
    metadata: { tagId },
  });
  return { ok: true };
}

export async function detachCustomerTagAction(
  tenantId: string,
  customerId: string,
  tagId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  await db.customerTag.deleteMany({ where: { tenantId, customerId, tagId } });
  await writeAudit(db, {
    userId: session.user.id,
    action: "detach-tag",
    entity: "customer",
    entityId: customerId,
    metadata: { tagId },
  });
  return { ok: true };
}

// --- Contacts --------------------------------------------------------------

export async function addContactAction(
  tenantId: string,
  customerId: string,
  input: ContactFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!(await assertCustomer(db, tenantId, customerId))) {
    return { ok: false, error: "Customer not found." };
  }

  if (parsed.data.isPrimary) {
    await db.contact.updateMany({ where: { customerId }, data: { isPrimary: false } });
  }

  await db.contact.create({
    data: {
      tenantId,
      customerId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      role: emptyToNull(parsed.data.role),
      isPrimary: parsed.data.isPrimary ?? false,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-contact",
    entity: "customer",
    entityId: customerId,
  });
  return { ok: true };
}

export async function updateContactAction(
  tenantId: string,
  contactId: string,
  input: ContactFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const contact = await db.contact.findFirst({
    where: { id: contactId, tenantId },
    select: { customerId: true },
  });
  if (!contact) return { ok: false, error: "Contact not found." };

  if (parsed.data.isPrimary && contact.customerId) {
    await db.contact.updateMany({
      where: { customerId: contact.customerId, id: { not: contactId } },
      data: { isPrimary: false },
    });
  }

  await db.contact.update({
    where: { id: contactId, tenantId },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: emptyToNull(parsed.data.email),
      phone: emptyToNull(parsed.data.phone),
      role: emptyToNull(parsed.data.role),
      isPrimary: parsed.data.isPrimary ?? false,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "update-contact",
    entity: "customer",
    entityId: contactId,
  });
  return { ok: true };
}

export async function deleteContactAction(
  tenantId: string,
  contactId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  try {
    await db.contact.delete({ where: { id: contactId, tenantId } });
  } catch {
    return { ok: false, error: "Contact not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-contact",
    entity: "customer",
    entityId: contactId,
  });
  return { ok: true };
}

// --- Addresses -------------------------------------------------------------

export async function addAddressAction(
  tenantId: string,
  customerId: string,
  input: AddressFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  const parsed = addressFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!(await assertCustomer(db, tenantId, customerId))) {
    return { ok: false, error: "Customer not found." };
  }

  if (parsed.data.isPrimary) {
    await db.address.updateMany({ where: { customerId }, data: { isPrimary: false } });
  }

  await db.address.create({
    data: {
      tenantId,
      customerId,
      label: emptyToNull(parsed.data.label),
      line1: parsed.data.line1,
      line2: emptyToNull(parsed.data.line2),
      city: emptyToNull(parsed.data.city),
      state: emptyToNull(parsed.data.state),
      postalCode: emptyToNull(parsed.data.postalCode),
      country: emptyToNull(parsed.data.country),
      isPrimary: parsed.data.isPrimary ?? false,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-address",
    entity: "customer",
    entityId: customerId,
  });
  return { ok: true };
}

export async function updateAddressAction(
  tenantId: string,
  addressId: string,
  input: AddressFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  const parsed = addressFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const address = await db.address.findFirst({
    where: { id: addressId, tenantId },
    select: { customerId: true },
  });
  if (!address) return { ok: false, error: "Address not found." };

  if (parsed.data.isPrimary && address.customerId) {
    await db.address.updateMany({
      where: { customerId: address.customerId, id: { not: addressId } },
      data: { isPrimary: false },
    });
  }

  await db.address.update({
    where: { id: addressId, tenantId },
    data: {
      label: emptyToNull(parsed.data.label),
      line1: parsed.data.line1,
      line2: emptyToNull(parsed.data.line2),
      city: emptyToNull(parsed.data.city),
      state: emptyToNull(parsed.data.state),
      postalCode: emptyToNull(parsed.data.postalCode),
      country: emptyToNull(parsed.data.country),
      isPrimary: parsed.data.isPrimary ?? false,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "update-address",
    entity: "customer",
    entityId: addressId,
  });
  return { ok: true };
}

export async function deleteAddressAction(
  tenantId: string,
  addressId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "customer", "update");
  try {
    await db.address.delete({ where: { id: addressId, tenantId } });
  } catch {
    return { ok: false, error: "Address not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-address",
    entity: "customer",
    entityId: addressId,
  });
  return { ok: true };
}
