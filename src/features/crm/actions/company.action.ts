"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  companyFormSchema,
  updateCompanyStatusSchema,
  type CompanyFormInput,
  type UpdateCompanyStatusInput,
} from "@/features/crm/schemas/company.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: CompanyFormInput) {
  return {
    name: d.name,
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    website: emptyToNull(d.website),
    taxId: emptyToNull(d.taxId),
    industry: emptyToNull(d.industry),
    notes: emptyToNull(d.notes),
  };
}

export async function createCompanyAction(
  tenantId: string,
  input: CompanyFormInput,
): Promise<ActionResult<{ companyId: string }>> {
  const { session, db } = await requirePermission(tenantId, "company", "create");

  const parsed = companyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const company = await db.company.create({
    data: { tenantId, ...toData(parsed.data) },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "company",
    entityId: company.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("company created", { tenantId, companyId: company.id });
  return { ok: true, data: { companyId: company.id } };
}

export async function updateCompanyAction(
  tenantId: string,
  companyId: string,
  input: CompanyFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "company", "update");

  const parsed = companyFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.company.update({ where: { id: companyId, tenantId }, data: toData(parsed.data) });
  } catch {
    return { ok: false, error: "Company not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "company",
    entityId: companyId,
  });
  return { ok: true };
}

export async function updateCompanyStatusAction(
  tenantId: string,
  companyId: string,
  input: UpdateCompanyStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "company", "manage");

  const parsed = updateCompanyStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.company.update({
      where: { id: companyId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Company not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "company",
    entityId: companyId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteCompanyAction(
  tenantId: string,
  companyId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "company", "delete");

  try {
    await db.company.update({
      where: { id: companyId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Company not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "company",
    entityId: companyId,
  });
  logger.info("company deleted", { tenantId, companyId });
  return { ok: true };
}
