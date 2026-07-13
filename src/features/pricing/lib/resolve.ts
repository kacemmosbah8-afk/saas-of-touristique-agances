import type { PricingComponent, PricingSettings } from "@/features/pricing/schemas/pricing.schema";

/**
 * Scope resolution — the Universal Pricing Engine's other pure core,
 * alongside `calculate.ts`. Precedence is "most specific wins":
 *
 *   SUPPLIER (settings.overrides[provider])
 *     └─ falls back to ─▶ TENANT (settings.default)
 *          └─ falls back to ─▶ GLOBAL (schema default: no components at all)
 *
 * A supplier key's mere presence in `overrides` — even with an empty
 * `components` array — counts as "configured": a tenant can deliberately
 * set zero markup for one supplier while keeping a non-zero default for
 * everyone else. Checking array length instead of key presence would
 * silently ignore that deliberate choice, so this checks `in` on the
 * record, not truthiness of its contents.
 */
export function resolveComponents(settings: PricingSettings, provider: string): PricingComponent[] {
  const key = provider.trim().toUpperCase();
  if (key.length > 0 && key in settings.overrides) {
    return settings.overrides[key].components;
  }
  return settings.default.components;
}
