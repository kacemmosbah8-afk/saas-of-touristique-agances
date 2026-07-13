/**
 * The provider-agnostic contract every supplier adapter implements. The
 * engine (`engine.ts`) depends on this interface only — it never imports a
 * concrete provider. Duffel was the first implementation
 * (`providers/duffel/duffel-execution-provider.ts`); Hotelbeds
 * (`providers/hotelbeds/hotelbeds-execution-provider.ts`) is the second,
 * proving Duffel was never the architecture. An Amadeus implementation is a
 * new adapter file plus one more member of the `provider` union below — not
 * a change to this interface's shape or to the engine.
 */

/**
 * One traveller/guest on the booking. Deliberately reused as-is for every
 * provider rather than a parallel "GuestInput" type for hotels — a
 * Hotelbeds room guest is a strict subset of what this already carries
 * (name, DOB, gender); `providerPassengerId` and the passport fields are
 * simply unused by `HotelbedsExecutionProvider`, the same way a provider
 * that doesn't need a field already ignores parts of a shared DTO
 * elsewhere in this codebase.
 */
export type PassengerInput = {
  /** The provider's own passenger id from the priced offer (Duffel: offer.passengers[].id). Unused by providers with no such concept (Hotelbeds). */
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
  /** Straight from BookingTraveller.type. Unused by Duffel (a flight has no adult/child occupancy split at booking time — fare class already encodes it); Hotelbeds uses it to build AD/CH room occupancy. */
  travellerType: "ADULT" | "CHILD" | "INFANT";
  /** Straight from BookingTraveller.isPrimary. Unused by Duffel; Hotelbeds uses it to pick the reservation holder (falls back to the first traveller if none is marked primary). */
  isPrimary: boolean;
};

export type ExecutionRequest = {
  tenantId: string;
  /** The SupplierOrder row this execution belongs to — known by the action
   * layer before it calls the engine. Duffel doesn't need it (an offer id
   * is enough); Hotelbeds sends it as `clientReference` on the booking
   * call, so a booking on Hotelbeds' own dashboard traces back to the
   * exact TravelOS record without needing a support ticket. */
  supplierOrderId: string;
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
      /** Where the order lands after a successful supplier call.
       * SUPPLIER_CONFIRMED: fully confirmed and paid (or no payment needed).
       * AWAITING_PAYMENT: reserved but still needs a separate payment call (Duffel HOLD).
       * AWAITING_SUPPLIER_CONFIRMATION: accepted by the supplier but not yet
       * guaranteed — e.g. Hotelbeds "ON REQUEST"/PENDING bookings — needs a
       * later reconciliation check, not a payment. */
      status: "SUPPLIER_CONFIRMED" | "AWAITING_PAYMENT" | "AWAITING_SUPPLIER_CONFIRMATION";
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

/**
 * The three states a supplier's own booking can be in, provider-agnostic —
 * Booking Status Resolution Capability's whole vocabulary. A provider that
 * returns AWAITING_SUPPLIER_CONFIRMATION from `execute()` (Hotelbeds "ON
 * REQUEST") is expected to implement `checkStatus` so that state can later
 * resolve; a provider that never does (Duffel) simply never implements it.
 */
export type SupplierBookingStatus =
  | "SUPPLIER_CONFIRMED"
  | "AWAITING_SUPPLIER_CONFIRMATION"
  | "CANCELLED";

export type StatusCheckResult = {
  status: SupplierBookingStatus;
  /** Raw-but-safe response summary for the SupplierOrderEvent audit trail. */
  providerMetadata: Record<string, unknown>;
};

export interface SupplierExecutionProvider {
  readonly provider: "DUFFEL" | "HOTELBEDS";
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel(order: SupplierOrderContext): Promise<CancellationResult>;
  /**
   * Fare/schedule modification — declared so the interface shape is
   * complete, deliberately not implemented by any provider this sprint (a
   * real change involves fare-difference and change-fee calculation that's
   * its own feature). Calling it on the current Duffel adapter rejects.
   */
  modify?(order: SupplierOrderContext, changes: unknown): Promise<ExecutionResult>;
  /**
   * Re-fetches the supplier's own current status for a previously-executed
   * order — the Booking Status Resolution Capability's one supplier-facing
   * call. Optional: only a provider whose `execute()` can land on
   * AWAITING_SUPPLIER_CONFIRMATION needs to implement it (Hotelbeds does;
   * Duffel's orders resolve synchronously at creation and never need
   * reconciling, so it has none — never called, never required to exist).
   * A thrown error (network/API failure) is caught and classified by the
   * caller with `classifyExecutionFailure`, exactly like `execute()`.
   */
  checkStatus?(order: SupplierOrderContext): Promise<StatusCheckResult>;
}
