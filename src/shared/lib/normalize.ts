/** Coerce an optional/empty string to null for nullable DB columns. */
export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Pass through an optional number, mapping undefined to null. */
export function numOrNull(value: number | null | undefined): number | null {
  return value == null ? null : value;
}
