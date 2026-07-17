import type { PaymentMethodType, ProviderType } from "@prisma/client";

/**
 * Payment configuration answers "how should this provider's own account pay
 * when creating a real order" — categorically separate from
 * `ProviderCredential` ("which account calls the API"). Provider-agnostic by
 * design: `PaymentConfiguration` is keyed by `[tenantId, provider]`, so a
 * future Hotelbeds/Amadeus payment concept is a second row, never a schema
 * or interface change. Today only Duffel's `execute()` actually reads this —
 * see `features/supplier-execution/providers/duffel/duffel-execution-provider.ts`.
 *
 * Stores no card/account data — only a method-type selection and a display
 * label. See the Prisma schema comment on `PaymentConfiguration` for exactly
 * why CARD/ARC_BSP_CASH are declared but not yet selectable.
 */
export type PaymentConfigurationView = {
  provider: ProviderType;
  methodType: PaymentMethodType;
  label: string;
  isActive: boolean;
  /** True once a tenant has explicitly saved a configuration; false means the built-in default (BALANCE) is in effect. */
  isConfigured: boolean;
};

/** Method types a tenant can actually select today — CARD/ARC_BSP_CASH are declared in the schema but not yet operable (see PROJECT.md). */
export const SELECTABLE_PAYMENT_METHOD_TYPES = ["BALANCE"] as const satisfies readonly PaymentMethodType[];
export type SelectablePaymentMethodType = (typeof SELECTABLE_PAYMENT_METHOD_TYPES)[number];

export const DEFAULT_PAYMENT_METHOD_TYPE: PaymentMethodType = "BALANCE";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  BALANCE: "Account Balance",
  CARD: "Card (per-booking, requires additional setup)",
  ARC_BSP_CASH: "ARC/BSP Cash (accredited agencies only)",
};
