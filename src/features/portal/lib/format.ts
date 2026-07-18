import type { ConfirmationStatus } from "@prisma/client";

/** Shared display formatting for the portal's read-only views. */

export function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString(undefined, { style: "currency", currency });
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { dateStyle: "long" });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Customer-safe translation of `ConfirmationStatus`. PENDING returns `null` —
 * the caller shows no badge at all rather than exposing an in-progress
 * operational state a customer has no way to act on.
 */
export function portalConfirmationStatusLabel(status: ConfirmationStatus): string | null {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "REJECTED":
      return "Unavailable";
    case "PENDING":
      return null;
  }
}
