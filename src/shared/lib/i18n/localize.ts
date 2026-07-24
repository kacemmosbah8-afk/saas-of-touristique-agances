import type { Locale } from "@/shared/i18n/dictionary";

/**
 * Resolves an admin-entered bilingual field to the visitor's language.
 * Arabic (`ar`) is always the bare field and the source of truth; French
 * (`fr`) is optional per the codebase's established convention (see
 * `PROJECT.md`'s bilingual content sprint) — an agency can publish before
 * translating everything, so a missing/blank French value falls back to
 * Arabic rather than showing empty content. Never machine-translates
 * anything: both values are exactly what the admin typed, or nothing.
 */
export function localize(locale: Locale, ar: string, fr: string | null | undefined): string {
  if (locale === "fr" && fr && fr.trim().length > 0) return fr;
  return ar;
}

/** Same fallback rule as `localize`, for fields that are themselves optional
 * in Arabic too (e.g. an optional note) — returns `null` only when neither
 * language has a value. */
export function localizeNullable(
  locale: Locale,
  ar: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  if (locale === "fr" && fr && fr.trim().length > 0) return fr;
  return ar && ar.trim().length > 0 ? ar : null;
}

/** Same fallback rule as `localize`, for string-array fields (highlights,
 * included services, amenities...). Falls back to the Arabic array as a
 * whole when the French array is empty, rather than per-item — an agency
 * translating an array is expected to translate the whole list at once. */
export function localizeList(
  locale: Locale,
  ar: string[] | null | undefined,
  fr: string[] | null | undefined,
): string[] {
  if (locale === "fr" && fr && fr.length > 0) return fr;
  return ar ?? [];
}
