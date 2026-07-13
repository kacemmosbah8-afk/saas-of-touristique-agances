/**
 * The provider-agnostic contract every billing provider implements —
 * mirrors `SupplierExecutionProvider` (Supplier Order Execution Capability)
 * exactly: the action layer orchestrates the domain-state transition
 * (Subscription status, SubscriptionEvent), this interface represents only
 * whatever needs to happen on the external side. For `ManualBillingProvider`
 * that's nothing — it's the honest first implementation, not a stub.
 * `StripeBillingProvider` is a second implementation of this same
 * interface, not built this sprint.
 */

export type ActivateSubscriptionRequest = {
  tenantId: string;
  planCode: string;
};

export type ActivateSubscriptionResult = { ok: true } | { ok: false; message: string };

export type ChangePlanRequest = {
  tenantId: string;
  newPlanCode: string;
};

export type ChangePlanResult = { ok: true } | { ok: false; message: string };

export type CancelSubscriptionRequest = {
  tenantId: string;
};

export type CancelSubscriptionResult = { ok: true } | { ok: false; message: string };

export interface BillingProvider {
  readonly provider: "MANUAL" | "STRIPE";
  activateSubscription(request: ActivateSubscriptionRequest): Promise<ActivateSubscriptionResult>;
  changePlan(request: ChangePlanRequest): Promise<ChangePlanResult>;
  cancelSubscription(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResult>;
}
