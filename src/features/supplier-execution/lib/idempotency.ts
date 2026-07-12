import { createHash } from "node:crypto";

/**
 * A stable idempotency key for one execution "generation" of a booking
 * item. Deterministic from (bookingItemId, generation) — the same inputs
 * always produce the same key, which is exactly what a unique-constraint
 * guard needs. `generation` increments only when a NEW execution intent is
 * created (never on retry — a retry reuses the same SupplierOrder row and
 * therefore the same key, since it's the same purchase intent, just another
 * attempt at it).
 */
export function buildIdempotencyKey(bookingItemId: string, generation = 1): string {
  return createHash("sha256").update(`supplier-order:${bookingItemId}:${generation}`).digest("hex");
}
