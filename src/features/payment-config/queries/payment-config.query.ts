import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";
import {
  DEFAULT_PAYMENT_METHOD_TYPE,
  PAYMENT_METHOD_LABELS,
  type PaymentConfigurationView,
} from "@/features/payment-config/lib/types";

function defaultLabel(provider: ProviderType): string {
  return `${PROVIDER_REGISTRY[provider].name} ${PAYMENT_METHOD_LABELS[DEFAULT_PAYMENT_METHOD_TYPE]}`;
}

/**
 * One read for the settings panel: the tenant's saved configuration for this
 * provider, or the built-in default (BALANCE, the only method type Duffel
 * order-creation has ever used) if none has been saved yet. Never throws —
 * an unconfigured tenant is a normal, expected state, not an error.
 */
export async function getPaymentConfiguration(
  db: TenantDb,
  tenantId: string,
  provider: ProviderType,
): Promise<PaymentConfigurationView> {
  const row = await db.paymentConfiguration.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });

  if (!row) {
    return {
      provider,
      methodType: DEFAULT_PAYMENT_METHOD_TYPE,
      label: defaultLabel(provider),
      isActive: true,
      isConfigured: false,
    };
  }

  return {
    provider: row.provider,
    methodType: row.methodType,
    label: row.label,
    isActive: row.isActive,
    isConfigured: true,
  };
}

/**
 * The one thing the booking flow actually needs — see
 * `features/supplier-execution/providers/duffel/duffel-execution-provider.ts`.
 * Falls back to BALANCE (the pre-existing, always-safe default) for any
 * tenant that hasn't configured or has deactivated their configuration,
 * exactly matching this codebase's behavior before payment configuration
 * existed — this feature can only ever narrow/redirect what already worked,
 * never break a tenant who never touches the new settings page.
 */
export async function getActivePaymentMethodType(
  db: TenantDb,
  tenantId: string,
  provider: ProviderType,
) {
  const config = await getPaymentConfiguration(db, tenantId, provider);
  return config.isActive ? config.methodType : DEFAULT_PAYMENT_METHOD_TYPE;
}
