"use server";

import type { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { moduleSettingsSchema, type ModuleSettingsInput } from "@/features/settings/schemas/settings.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateModuleSettingsAction(
  tenantId: string,
  input: ModuleSettingsInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "settings", "update");

  const parsed = moduleSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const value = parsed.data.settings as Prisma.InputJsonValue;

  await db.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, profileSettings: value },
    update: { profileSettings: value },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-profile-settings",
    entity: "settings",
  });
  return { ok: true };
}
