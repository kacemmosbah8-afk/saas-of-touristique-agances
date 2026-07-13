import "server-only";

import type {
  BillingProvider,
  ActivateSubscriptionRequest,
  ActivateSubscriptionResult,
  ChangePlanRequest,
  ChangePlanResult,
  CancelSubscriptionRequest,
  CancelSubscriptionResult,
} from "@/features/billing/lib/types";

/**
 * The first real implementation of `BillingProvider` — no payment
 * collection, no external API. An OWNER-triggered, fully audited plan
 * activation for trials, comped/negotiated deals, and development. This
 * proves the interface the same way `DuffelExecutionProvider` proved
 * `SupplierExecutionProvider`: a second, low-risk implementation exists
 * before the highest-risk one (Stripe) is built, so the interface shape is
 * validated by real use, not by inspection alone.
 */
export class ManualBillingProvider implements BillingProvider {
  readonly provider = "MANUAL" as const;

  async activateSubscription(
    _request: ActivateSubscriptionRequest,
  ): Promise<ActivateSubscriptionResult> {
    return { ok: true };
  }

  async changePlan(_request: ChangePlanRequest): Promise<ChangePlanResult> {
    return { ok: true };
  }

  async cancelSubscription(_request: CancelSubscriptionRequest): Promise<CancelSubscriptionResult> {
    return { ok: true };
  }
}

export function createManualBillingProvider(): ManualBillingProvider {
  return new ManualBillingProvider();
}
