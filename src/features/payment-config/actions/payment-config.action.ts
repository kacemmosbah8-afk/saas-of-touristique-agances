"use server";

import type { ProviderType } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { logger } from "@/shared/lib/logger";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";
import {
  updatePaymentConfigurationSchema,
  type UpdatePaymentConfigurationInput,
} from "@/features/payment-config/schemas/payment-config.schema";
import { PAYMENT_METHOD_LABELS } from "@/features/payment-config/lib/types";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * Sets which payment method a provider's `execute()` requests on its next
 * order — never touches a card, a token, or any Duffel resource directly.
 * The booking engine reads this at execution time
 * (`getActivePaymentMethodType`); nothing about the engine's own shape
 * changes when this changes, per the architecture requirement this feature
 * was built to satisfy.
 */
export async function updatePaymentConfigurationAction(
  tenantId: string,
  provider: ProviderType,
  input: UpdatePaymentConfigurationInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = updatePaymentConfigurationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment method." };
  }
  const { methodType } = parsed.data;

  const label = `${PROVIDER_REGISTRY[provider].name} ${PAYMENT_METHOD_LABELS[methodType]}`;

  await db.paymentConfiguration.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    create: { tenantId, provider, methodType, label, isActive: true },
    update: { methodType, label, isActive: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-payment-configuration",
    entity: "settings",
    metadata: { provider, methodType },
  });
  logger.info("payment configuration updated", { tenantId, provider, methodType });
  return { ok: true };
}
