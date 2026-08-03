import { z } from "zod";

/**
 * An optional `YYYY-MM-DD` string field, shared by every departure/return
 * date pair in the app (public booking requests, admin quotes/bookings).
 * Uses one `superRefine` rather than chained `refine`s so a malformed string
 * only ever reports the format error, never also a confusing "in the past"
 * error derived from `NaN` comparisons.
 */
export function optionalDateString(opts?: {
  notInPast?: boolean;
  invalidMessage?: string;
  pastMessage?: string;
}) {
  const invalidMessage = opts?.invalidMessage ?? "Invalid date";
  const pastMessage = opts?.pastMessage ?? "Date can't be in the past";

  return z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .superRefine((value, ctx) => {
      if (!value) return;

      if (!z.iso.date().safeParse(value).success) {
        ctx.addIssue({ code: "custom", message: invalidMessage });
        return;
      }

      if (opts?.notInPast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(value) < today) {
          ctx.addIssue({ code: "custom", message: pastMessage });
        }
      }
    });
}

/**
 * Cross-field "end >= start" check for a date-pair schema, e.g.:
 * `.refine(...dateRangeRefinement("travelStartDate", "travelEndDate"))`.
 * Only compares when both fields are present — each field's own format
 * validation is handled separately by `optionalDateString`.
 */
export function dateRangeRefinement<Start extends string, End extends string>(
  startField: Start,
  endField: End,
  message = "End date must be on or after the start date",
): [
  (data: Partial<Record<Start | End, string | undefined>>) => boolean,
  { message: string; path: [End] },
] {
  return [
    (data) => {
      const start = data[startField];
      const end = data[endField];
      return !start || !end || Date.parse(end) >= Date.parse(start);
    },
    { message, path: [endField] },
  ];
}
