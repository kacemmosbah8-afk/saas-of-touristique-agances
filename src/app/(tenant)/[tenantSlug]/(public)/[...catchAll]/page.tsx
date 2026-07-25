import { notFound } from "next/navigation";

/**
 * Catches any URL under `[tenantSlug]/*` that doesn't match a real route
 * (typo'd link, stale bookmark, bad crawl) and routes it through the
 * tenant's own `not-found.tsx` instead of the framework's bare default.
 * Without this, an unmatched path can't resolve into the `[tenantSlug]`
 * segment at all, so Next falls back to the generic, unbranded 404 —
 * `notFound()` only reaches the nested boundary when called from inside a
 * route that actually matched.
 */
export default function CatchAll() {
  notFound();
}
