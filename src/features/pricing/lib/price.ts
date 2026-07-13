import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { getWorkspaceSettings } from "@/features/settings/queries/settings.query";
import { calculatePrice, type PricingResult } from "@/features/pricing/lib/calculate";
import { resolveComponents } from "@/features/pricing/lib/resolve";
import type { PricingSettings } from "@/features/pricing/schemas/pricing.schema";

/**
 * The Universal Pricing Engine's one impure boundary — every price-facing
 * call site (search results, checkrates/offer revalidation, booking-prep)
 * goes through this file, never `calculatePrice`/`resolveComponents`
 * directly, so a DB read is never duplicated per rate/offer in a result
 * list. Not unit-tested itself (three-line composition of two already-
 * tested pure functions plus a DB read) — consistent with this codebase's
 * standing convention that DB-touching functions aren't unit-tested with a
 * mocked Prisma client (see Task 3's reconciliation.ts precedent).
 */

/** Load a tenant's pricing policy once; reuse the result across every rate/offer in a single action call. */
export async function loadPricingContext(db: TenantDb): Promise<PricingSettings> {
  const settings = await getWorkspaceSettings(db);
  return settings.pricing;
}

/** Price one supplier amount against an already-loaded context — no I/O. */
export function priceAmount(
  context: PricingSettings,
  provider: string,
  cost: number,
  currency: string,
): PricingResult {
  return calculatePrice(cost, currency, resolveComponents(context, provider));
}

/** Convenience for a single price (e.g. inside booking-prep, which only ever prices one line). */
export async function priceForProvider(
  db: TenantDb,
  provider: string,
  cost: number,
  currency: string,
): Promise<PricingResult> {
  const context = await loadPricingContext(db);
  return priceAmount(context, provider, cost, currency);
}
