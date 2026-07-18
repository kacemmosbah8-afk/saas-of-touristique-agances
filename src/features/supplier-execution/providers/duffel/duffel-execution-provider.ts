import "server-only";

import type { DuffelClient } from "@/features/integrations/providers/duffel/duffel-client";
import type {
  SupplierExecutionProvider,
  ExecutionRequest,
  ExecutionResult,
  SupplierOrderContext,
  CancellationResult,
} from "@/features/supplier-execution/lib/types";

/**
 * Duffel's implementation of the generic `SupplierExecutionProvider`
 * interface — the first of what should be several. Any thrown
 * `IntegrationError` from `DuffelClient` propagates to the engine, which
 * classifies it (retryable vs. permanent) — this adapter doesn't duplicate
 * that classification.
 */
export class DuffelExecutionProvider implements SupplierExecutionProvider {
  readonly provider = "DUFFEL" as const;

  constructor(private readonly client: DuffelClient) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Prefer a HOLD (fare reserved, nothing committed yet) whenever the
    // offer supports one; only fall back to an immediate commitment when
    // the caller explicitly resolved commitMode to IMMEDIATE (see the
    // action layer's decision, driven by the offer's own paymentRequiredBy).
    const type = request.commitMode === "HOLD" ? "hold" : "instant";

    const order = await this.client.createOrder({
      offerId: request.supplierOfferRef,
      type,
      payment:
        type === "instant"
          ? {
              amount: request.amount.toFixed(2),
              currency: request.currency,
              method: "balance",
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
      status: order.awaitingPayment ? "AWAITING_SUPPLIER_SETTLEMENT" : "SUPPLIER_CONFIRMED",
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

export function createDuffelExecutionProvider(client: DuffelClient): DuffelExecutionProvider {
  return new DuffelExecutionProvider(client);
}
