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
