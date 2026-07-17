import "server-only";

import type { PaymentMethodType } from "@prisma/client";

import type { DuffelClient } from "@/features/integrations/providers/duffel/duffel-client";
import type {
  SupplierExecutionProvider,
  ExecutionRequest,
  ExecutionResult,
  SupplierOrderContext,
  CancellationResult,
} from "@/features/supplier-execution/lib/types";

/** Maps TravelOS's provider-agnostic payment method type to Duffel's own `payments[].type` value. */
const DUFFEL_PAYMENT_TYPE: Record<PaymentMethodType, "balance" | "card" | "arc_bsp_cash"> = {
  BALANCE: "balance",
  CARD: "card",
  ARC_BSP_CASH: "arc_bsp_cash",
};

/**
 * Duffel's implementation of the generic `SupplierExecutionProvider`
 * interface — the first of what should be several. Any thrown
 * `IntegrationError` from `DuffelClient` propagates to the engine, which
 * classifies it (retryable vs. permanent) — this adapter doesn't duplicate
 * that classification.
 */
export class DuffelExecutionProvider implements SupplierExecutionProvider {
  readonly provider = "DUFFEL" as const;

  /**
   * Resolved by the caller (`execution.action.ts`) from that tenant's
   * `PaymentConfiguration` (`features/payment-config/`) before constructing
   * this provider — never assumed here. Defaults to BALANCE, the only
   * method type this codebase has ever actually used, so a caller that
   * doesn't pass one gets identical behavior to before this existed.
   */
  constructor(
    private readonly client: DuffelClient,
    private readonly paymentMethodType: PaymentMethodType = "BALANCE",
  ) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Prefer a HOLD (no money moves) whenever the offer supports one; only
    // fall back to an instant, balance-paid purchase when the caller
    // explicitly resolved paymentMode to BALANCE (see the action layer's
    // payment-mode decision, driven by the offer's own paymentRequiredBy).
    const type = request.paymentMode === "HOLD" ? "hold" : "instant";

    if (type === "instant" && this.paymentMethodType !== "BALANCE") {
      // CARD requires Duffel's own frontend card-collection + 3D Secure
      // session (not yet built — see PaymentConfiguration's schema comment)
      // and ARC_BSP_CASH requires per-agency setup with Duffel support.
      // Sending either as-is to Duffel would fail anyway (missing
      // three_d_secure_session_id, or an unprovisioned ARC/BSP account) —
      // failing here is the same outcome with a message that says why.
      return {
        ok: false,
        retryable: false,
        message: `This agency's payment configuration selects ${this.paymentMethodType}, which isn't operable yet — switch back to Account Balance in Payment Settings.`,
      };
    }

    const order = await this.client.createOrder({
      offerId: request.supplierOfferRef,
      type,
      payment:
        type === "instant"
          ? {
              amount: request.amount.toFixed(2),
              currency: request.currency,
              method: DUFFEL_PAYMENT_TYPE[this.paymentMethodType],
            }
          : null,
      passengers: request.passengers.map((p) => ({
        providerPassengerId: p.providerPassengerId,
        givenName: p.firstName,
        familyName: p.lastName,
        bornOn: p.dateOfBirth,
        gender: p.gender === "FEMALE" ? "f" : "m",
        email: p.email,
        phoneNumber: p.phone,
        identityDocument:
          p.passportNumber && p.passportExpiry && p.passportIssuingCountry
            ? {
                uniqueIdentifier: p.passportNumber,
                expiresOn: p.passportExpiry,
                issuingCountryCode: p.passportIssuingCountry,
              }
            : null,
      })),
    });

    return {
      ok: true,
      supplierOrderId: order.id,
      confirmationNumber: order.bookingReference,
      status: order.awaitingPayment ? "AWAITING_PAYMENT" : "SUPPLIER_CONFIRMED",
      providerMetadata: {
        duffelOrderId: order.id,
        bookingReference: order.bookingReference,
        totalAmount: order.totalAmount,
        currency: order.currency,
      },
    };
  }

  async cancel(order: SupplierOrderContext): Promise<CancellationResult> {
    if (!order.supplierOrderRef) {
      return { ok: false, message: "No supplier order id on file to cancel." };
    }
    const result = await this.client.cancelOrder(order.supplierOrderRef);
    return { ok: true, providerMetadata: { confirmed: result.confirmed } };
  }
}

export function createDuffelExecutionProvider(
  client: DuffelClient,
  paymentMethodType?: PaymentMethodType,
): DuffelExecutionProvider {
  return new DuffelExecutionProvider(client, paymentMethodType);
}
