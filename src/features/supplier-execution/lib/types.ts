/**
 * The provider-agnostic contract every supplier adapter implements. The
 * engine (`engine.ts`) depends on this interface only — it never imports a
 * concrete provider. Duffel is the first implementation
 * (`providers/duffel/duffel-execution-provider.ts`); a Hotelbeds or Amadeus
 * implementation is a new adapter file, not a change here or in the engine.
 */

export type PassengerInput = {
  /** The provider's own passenger id from the priced offer (Duffel: offer.passengers[].id). */
  providerPassengerId: string;
  firstName: string;
  lastName: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | "UNSPECIFIED";
  email: string | null;
  phone: string | null;
  passportNumber: string | null;
  passportIssuingCountry: string | null;
  passportExpiry: string | null;
};

export type ExecutionRequest = {
  tenantId: string;
  /** The priced offer/rate this execution is purchasing (Duffel offer id, etc.). */
  supplierOfferRef: string;
  passengers: PassengerInput[];
  /** HOLD reserves without paying; BALANCE debits the tenant's own pre-funded
   * supplier account. The engine picks this (see engine.ts); the provider
   * adapter must honor it, never silently upgrade HOLD to a paid purchase. */
  paymentMode: "HOLD" | "BALANCE";
  currency: string;
  amount: number;
};

export type ExecutionResult =
  | {
      ok: true;
      supplierOrderId: string;
      confirmationNumber: string;
      /** Whether the order still needs a separate payment call (HOLD) or is
       * already paid (BALANCE / an offer that only supports instant purchase). */
      awaitingPayment: boolean;
      /** Raw-but-safe response summary for the SupplierOrderEvent audit trail. */
      providerMetadata: Record<string, unknown>;
    }
  | {
      ok: false;
      /** Drives SupplierOrder.retryable — see lib/error-classification.ts. */
      retryable: boolean;
      message: string;
      providerMetadata?: Record<string, unknown>;
    };

export type SupplierOrderContext = {
  tenantId: string;
  supplierOrderId: string;
  /** The confirmed order's id at the supplier, if one exists. */
  supplierOrderRef: string | null;
};

export type CancellationResult =
  | { ok: true; providerMetadata: Record<string, unknown> }
  | { ok: false; message: string; providerMetadata?: Record<string, unknown> };

export interface SupplierExecutionProvider {
  readonly provider: "DUFFEL";
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel(order: SupplierOrderContext): Promise<CancellationResult>;
  /**
   * Fare/schedule modification — declared so the interface shape is
   * complete, deliberately not implemented by any provider this sprint (a
   * real change involves fare-difference and change-fee calculation that's
   * its own feature). Calling it on the current Duffel adapter rejects.
   */
  modify?(order: SupplierOrderContext, changes: unknown): Promise<ExecutionResult>;
}
