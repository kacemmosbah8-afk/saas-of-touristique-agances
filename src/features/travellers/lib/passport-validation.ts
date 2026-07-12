/**
 * Passport expiry checks. Pure and date-injectable so the same rules run in
 * unit tests, the action layer, and the UI (to badge travellers whose
 * documents put the trip at risk).
 *
 * The "six months validity" convention: many destinations refuse entry when
 * the passport expires within six months of the trip. We flag against travel
 * *end* when the booking has dates (the passport must outlive the whole
 * trip), and against today otherwise.
 */

export type PassportCheck =
  | "MISSING" // no expiry recorded — data incomplete, not necessarily invalid
  | "EXPIRED" // already expired
  | "EXPIRES_BEFORE_TRAVEL" // valid today, but not on the travel dates
  | "EXPIRES_WITHIN_SIX_MONTHS" // hits the common six-month entry rule
  | "VALID";

const SIX_MONTHS_DAYS = 182;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function checkPassportExpiry(
  passportExpiry: Date | null,
  travelEndDate: Date | null,
  now: Date = new Date(),
): PassportCheck {
  if (!passportExpiry) return "MISSING";
  const expiry = passportExpiry.getTime();

  if (expiry < now.getTime()) return "EXPIRED";
  if (travelEndDate && expiry < travelEndDate.getTime()) return "EXPIRES_BEFORE_TRAVEL";

  const reference = travelEndDate ?? now;
  if (expiry < addDays(reference, SIX_MONTHS_DAYS).getTime()) {
    return "EXPIRES_WITHIN_SIX_MONTHS";
  }
  return "VALID";
}

export const PASSPORT_CHECK_LABELS: Record<PassportCheck, string> = {
  MISSING: "No passport expiry on file",
  EXPIRED: "Passport expired",
  EXPIRES_BEFORE_TRAVEL: "Passport expires before travel ends",
  EXPIRES_WITHIN_SIX_MONTHS: "Passport expires within 6 months of travel",
  VALID: "Passport valid",
};

/** Checks that should block or loudly warn before travel. */
export function isPassportProblem(check: PassportCheck): boolean {
  return check === "EXPIRED" || check === "EXPIRES_BEFORE_TRAVEL";
}

/** Checks worth a soft warning (incomplete data or the six-month rule). */
export function isPassportWarning(check: PassportCheck): boolean {
  return check === "MISSING" || check === "EXPIRES_WITHIN_SIX_MONTHS";
}
