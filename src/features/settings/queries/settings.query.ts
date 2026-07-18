import type { CustomFieldType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import {
  crmSettingsSchema,
  leadSettingsSchema,
  supplierSettingsSchema,
  providerSettingsSchema,
  type CrmSettings,
  type LeadSettings,
  type SupplierSettings,
  type ProviderSettings,
} from "@/features/settings/schemas/settings.schema";

export type WorkspaceSettings = {
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTimezone: string;
  defaultCountry: string | null;
  crm: CrmSettings;
  lead: LeadSettings;
  supplier: SupplierSettings;
  provider: ProviderSettings;
};

/**
 * Read the tenant's settings, falling back to schema defaults for anything
 * missing — the row is only created on first write.
 */
export async function getWorkspaceSettings(db: TenantDb): Promise<WorkspaceSettings> {
  const row = await db.tenantSettings.findFirst();

  return {
    defaultCurrency: row?.defaultCurrency ?? "USD",
    defaultLanguage: row?.defaultLanguage ?? "en",
    defaultTimezone: row?.defaultTimezone ?? "UTC",
    defaultCountry: row?.defaultCountry ?? null,
    crm: crmSettingsSchema.parse(row?.crmSettings ?? {}),
    lead: leadSettingsSchema.parse(row?.leadSettings ?? {}),
    supplier: supplierSettingsSchema.parse(row?.supplierSettings ?? {}),
    provider: providerSettingsSchema.parse(row?.providerSettings ?? {}),
  };
}

export type TagItem = { id: string; name: string; color: string; usageCount: number };

export async function listTags(db: TenantDb): Promise<TagItem[]> {
  const tags = await db.tag.findMany({
    include: { _count: { select: { customerTags: true } } },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    usageCount: t._count.customerTags,
  }));
}

export type TravelCategoryItem = { id: string; name: string; description: string | null };

export async function listTravelCategories(db: TenantDb): Promise<TravelCategoryItem[]> {
  return db.travelCategory.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

export type CustomFieldItem = {
  id: string;
  entity: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  position: number;
};

export async function listCustomFields(db: TenantDb): Promise<CustomFieldItem[]> {
  return db.customField.findMany({
    select: {
      id: true,
      entity: true,
      label: true,
      type: true,
      options: true,
      required: true,
      position: true,
    },
    orderBy: [{ entity: "asc" }, { position: "asc" }],
  });
}
