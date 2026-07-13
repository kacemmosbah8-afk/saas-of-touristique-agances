import "server-only";

import type { HotelbedsClient } from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import type { HotelBookingPaxInput, HotelBookingStatus } from "@/features/integrations/lib/dto";
import type {
  SupplierExecutionProvider,
  ExecutionRequest,
  ExecutionResult,
  SupplierOrderContext,
  CancellationResult,
} from "@/features/supplier-execution/lib/types";

/**
 * Hotelbeds's implementation of the generic `SupplierExecutionProvider`
 * interface — the second, proving Duffel was the first adapter, not the
 * architecture. Every Hotelbeds-specific concern (no-hold money model,
 * AD/CH pax mapping, single-step cancellation, ON REQUEST bookings) lives
 * entirely in this file; the engine and action layer stay generic.
 */

/** Matches the placeholder child age already used for availability search
 * (see HotelbedsClient.searchAvailability) when a traveller's real date of
 * birth isn't on file — Hotelbeds requires a CH pax to carry an age. */
const DEFAULT_CHILD_AGE = 8;

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/**
 * PENDING is the only wire status that means "not yet confirmed" on a
 * create-booking response. Everything else that still carries a real
 * reference (CONFIRMED, GUARANTEED, and even an unrecognized/CANCELLED
 * wire value) is treated as confirmed rather than silently discarded —
 * Hotelbeds already accepted the request and a reference exists, so the
 * order is real and must not be dropped as "failed"; the raw status is
 * preserved in providerMetadata for a human to double-check.
 */
export function toExecutionStatus(
  status: HotelBookingStatus,
): "SUPPLIER_CONFIRMED" | "AWAITING_SUPPLIER_CONFIRMATION" {
  return status === "PENDING" ? "AWAITING_SUPPLIER_CONFIRMATION" : "SUPPLIER_CONFIRMED";
}

export class HotelbedsExecutionProvider implements SupplierExecutionProvider {
  readonly provider = "HOTELBEDS" as const;

  constructor(private readonly client: HotelbedsClient) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Hotelbeds has no hold concept — a booking call commits against the
    // tenant's pre-funded credit account immediately. Refuse rather than
    // silently turning a HOLD request into a real charge.
    if (request.paymentMode !== "BALANCE") {
      return {
        ok: false,
        retryable: false,
        message:
          "Hotelbeds has no hold concept — every booking commits against the tenant's balance immediately. Refusing to execute a HOLD request rather than silently charging the account.",
      };
    }

    const holder = request.passengers.find((p) => p.isPrimary) ?? request.passengers[0];
    if (!holder) {
      return { ok: false, retryable: false, message: "No passengers supplied to book." };
    }

    // Infants don't occupy their own bed/rate in Hotelbeds' hotel occupancy
    // model, so they aren't declared as a pax here — a known limitation
    // alongside the single-room-only support (see dto.ts, CreateHotelBookingInput).
    const paxes: HotelBookingPaxInput[] = request.passengers
      .filter((p) => p.travellerType !== "INFANT")
      .map((p) => ({
        roomId: 1,
        type: p.travellerType === "CHILD" ? "CH" : "AD",
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.travellerType === "CHILD" ? (ageFromDob(p.dateOfBirth) ?? DEFAULT_CHILD_AGE) : null,
      }));

    const booking = await this.client.createBooking({
      rateKey: request.supplierOfferRef,
      holder: { firstName: holder.firstName, lastName: holder.lastName },
      paxes,
      clientReference: request.supplierOrderId,
    });

    if (!booking) {
      return {
        ok: false,
        retryable: false,
        message:
          "Hotelbeds rejected the booking (no reference returned) — the rate is likely no longer available at this price.",
      };
    }

    return {
      ok: true,
      supplierOrderId: booking.reference,
      confirmationNumber: booking.reference,
      status: toExecutionStatus(booking.status),
      providerMetadata: {
        hotelbedsReference: booking.reference,
        hotelbedsStatus: booking.status,
        hotelName: booking.hotelName,
        totalNet: booking.totalNet,
        currency: booking.currency,
      },
    };
  }

  async cancel(order: SupplierOrderContext): Promise<CancellationResult> {
    if (!order.supplierOrderRef) {
      return { ok: false, message: "No supplier order id on file to cancel." };
    }
    const result = await this.client.cancelBooking(order.supplierOrderRef);
    if (!result) {
      return {
        ok: false,
        message:
          "Hotelbeds did not return a cancellation confirmation — the booking reference may be invalid. Manual verification against the Hotelbeds dashboard is required.",
      };
    }
    return {
      ok: true,
      providerMetadata: {
        hotelbedsStatus: result.status,
        cancellationAmount: result.cancellationAmount,
        currency: result.currency,
      },
    };
  }
}

export function createHotelbedsExecutionProvider(client: HotelbedsClient): HotelbedsExecutionProvider {
  return new HotelbedsExecutionProvider(client);
}
