"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  generalSettingsSchema,
  moduleSettingsSchema,
  tagFormSchema,
  travelCategoryFormSchema,
  customFieldFormSchema,
  type GeneralSettingsInput,
  type ModuleSettingsInput,
  type TagFormInput,
  type TravelCategoryFormInput,
  type CustomFieldFormInput,
} from "@/features/settings/schemas/settings.schema";
import type { ActionResult } from "@/shared/types/action-result";

// ---------------------------------------------------------------------------
// Workspace settings
// ---------------------------------------------------------------------------

export async function updateGeneralSettingsAction(
  tenantId: string,
  input: GeneralSettingsInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = {
    defaultCurrency: parsed.data.defaultCurrency,
    defaultLanguage: parsed.data.defaultLanguage,
    defaultTimezone: parsed.data.defaultTimezone,
    defaultCountry: emptyToNull(parsed.data.defaultCountry),
  };

  await db.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-general",
    entity: "settings",
    metadata: data,
  });
  logger.info("general settings updated", { tenantId });
  return { ok: true };
}

const MODULE_COLUMN = {
  crm: "crmSettings",
  lead: "leadSettings",
  supplier: "supplierSettings",
  profile: "profileSettings",
} as const;

export async function updateModuleSettingsAction(
  tenantId: string,
  input: ModuleSettingsInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = moduleSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const column = MODULE_COLUMN[parsed.data.module];
  const value = parsed.data.settings as Prisma.InputJsonValue;

  await db.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, [column]: value },
    update: { [column]: value },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: `update-${parsed.data.module}-settings`,
    entity: "settings",
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function createTagAction(
  tenantId: string,
  input: TagFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.tag.create({
      data: { tenantId, name: parsed.data.name, color: parsed.data.color },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A tag with this name already exists." };
    }
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "create-tag",
    entity: "settings",
    metadata: { name: parsed.data.name },
  });
  return { ok: true };
}

export async function updateTagAction(
  tenantId: string,
  tagId: string,
  input: TagFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.tag.update({
      where: { id: tagId, tenantId },
      data: { name: parsed.data.name, color: parsed.data.color },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A tag with this name already exists." };
    }
    return { ok: false, error: "Tag not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-tag",
    entity: "settings",
    entityId: tagId,
  });
  return { ok: true };
}

export async function deleteTagAction(tenantId: string, tagId: string): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  try {
    await db.tag.delete({ where: { id: tagId, tenantId } });
  } catch {
    return { ok: false, error: "Tag not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-tag",
    entity: "settings",
    entityId: tagId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Travel categories
// ---------------------------------------------------------------------------

export async function createTravelCategoryAction(
  tenantId: string,
  input: TravelCategoryFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = travelCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.travelCategory.create({
      data: {
        tenantId,
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A category with this name already exists." };
    }
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "create-category",
    entity: "settings",
    metadata: { name: parsed.data.name },
  });
  return { ok: true };
}

export async function deleteTravelCategoryAction(
  tenantId: string,
  categoryId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  try {
    await db.travelCategory.delete({ where: { id: categoryId, tenantId } });
  } catch {
    return { ok: false, error: "Category not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-category",
    entity: "settings",
    entityId: categoryId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Custom fields
// ---------------------------------------------------------------------------

export async function createCustomFieldAction(
  tenantId: string,
  input: CustomFieldFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = customFieldFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const last = await db.customField.findFirst({
    where: { entity: parsed.data.entity },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.customField.create({
    data: {
      tenantId,
      entity: parsed.data.entity,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.type === "SELECT" ? (parsed.data.options ?? []) : [],
      required: parsed.data.required ?? false,
      position: (last?.position ?? -1) + 1,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create-custom-field",
    entity: "settings",
    metadata: { entity: parsed.data.entity, label: parsed.data.label },
  });
  return { ok: true };
}

export async function deleteCustomFieldAction(
  tenantId: string,
  fieldId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  try {
    await db.customField.delete({ where: { id: fieldId, tenantId } });
  } catch {
    return { ok: false, error: "Field not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-custom-field",
    entity: "settings",
    entityId: fieldId,
  });
  return { ok: true };
}
