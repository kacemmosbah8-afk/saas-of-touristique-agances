import { z } from "zod";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Real phone-number format validation/normalization, shared by any form
 * that needs more than "non-empty string" — most of the codebase's `phone`
 * fields are still free text (see `booking-request.schema.ts` etc.), but a
 * field this codebase treats as *the* contact channel for follow-up (visa
 * assistance) needs a number staff can actually dial.
 *
 * This validates FORMAT only — it proves the string parses as a plausible
 * phone number, not that it's reachable or belongs to the submitter. No
 * SMS/OTP provider exists in this codebase (see PROJECT.md); never label a
 * format-validated number as "verified".
 */

/** Parses `value` against `defaultCountry` (used when the input has no `+`
 * country code of its own) and returns the E.164 form, or null if it
 * doesn't parse as a plausible number at all. */
export function normalizePhoneNumber(value: string, defaultCountry?: CountryCode): string | null {
  const phone = parsePhoneNumberFromString(value, defaultCountry);
  return phone && phone.isValid() ? phone.number : null;
}

export function phoneFormatSchema(opts: { message: string; defaultCountry?: CountryCode }) {
  return z.string().trim().superRefine((value, ctx) => {
    if (!normalizePhoneNumber(value, opts.defaultCountry)) {
      ctx.addIssue({ code: "custom", message: opts.message });
    }
  });
}
