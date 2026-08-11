import type { Locale } from "@/shared/i18n/dictionary";
import { VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";
import { getCountryOptions } from "@/shared/lib/reference-data";
import { resolveDocumentRequirements, computeCompleteness, type DocumentRequirementKey } from "@/features/visa-requests/lib/document-requirements";
import type { VisaRequestExportRow } from "@/features/visa-requests/queries/list-visa-requests-for-export.query";

/**
 * Plain hand-rolled CSV — no `papaparse`/`exceljs` dependency for what's
 * fundamentally flat tabular text. Excel opens CSV natively, so this covers
 * "CSV/Excel export" without a new library. Document *files* are
 * deliberately excluded (metadata only) — actual passport/document access
 * stays behind the existing admin-permission-gated detail page, not bundled
 * into an exportable spreadsheet.
 */

const COLUMNS = [
  "Reference",
  "Status",
  "Submitted at",
  "Full name",
  "Email",
  "Phone",
  "Phone verified",
  "Destination",
  "Nationality",
  "Visa type",
  "Travel start",
  "Travel end",
  "Traveler count",
  "Traveler names",
  "Country of residence",
  "Purpose of travel",
  "Employment status",
  "Accommodation type",
  "Payer type",
  "Previous travel disclosed",
  "Document count",
  "Document categories",
  "Required docs satisfied/total",
  "Missing required document keys",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function countryLabel(locale: Locale, code: string): string {
  return getCountryOptions(locale).find((c) => c.value === code)?.label ?? code;
}

/** Re-resolves the checklist for rows that have a complete questionnaire —
 * returns `null` for legacy rows submitted before the questionnaire
 * existed, same convention as `get-visa-request.query.ts`'s
 * `computeVisaRequestCompleteness`. */
function completenessFor(row: VisaRequestExportRow): { satisfied: number; total: number; missing: DocumentRequirementKey[] } | null {
  if (!row.countryOfResidence || !row.purposeOfTravel || !row.employmentStatus || !row.accommodationType || !row.payerType) {
    return null;
  }
  const checklist = resolveDocumentRequirements({
    destinationCountry: row.destinationCountry,
    countryOfResidence: row.countryOfResidence,
    purposeOfTravel: row.purposeOfTravel,
    employmentStatus: row.employmentStatus,
    accommodationType: row.accommodationType,
    payerType: row.payerType,
    hasPreviousTravel: row.hasPreviousTravel,
  });
  const result = computeCompleteness(
    checklist,
    row.documents.map((d) => ({ requirementKey: d.requirementKey as DocumentRequirementKey | null })),
  );
  return { satisfied: result.requiredSatisfied, total: result.requiredTotal, missing: result.missingRequired };
}

export function buildVisaRequestsCsv(rows: VisaRequestExportRow[], locale: Locale): string {
  const lines = [COLUMNS.join(",")];

  for (const row of rows) {
    const completeness = completenessFor(row);
    const fields = [
      row.reference,
      VISA_REQUEST_STATUS_LABELS[row.status],
      row.createdAt.toISOString(),
      row.fullName,
      row.email ?? "",
      row.phone,
      row.phoneVerifiedAt ? "Yes" : "No",
      countryLabel(locale, row.destinationCountry),
      countryLabel(locale, row.nationality),
      row.visaType,
      formatDate(row.travelStartDate),
      formatDate(row.travelEndDate),
      String(row.travelerCount),
      row.travellers.map((t) => `${t.firstName} ${t.lastName}`).join("; "),
      row.countryOfResidence ? countryLabel(locale, row.countryOfResidence) : "",
      row.purposeOfTravel ?? "",
      row.employmentStatus ?? "",
      row.accommodationType ?? "",
      row.payerType ?? "",
      row.hasPreviousTravel ? "Yes" : "No",
      String(row.documents.length),
      row.documents.map((d) => d.category).join("; "),
      completeness ? `${completeness.satisfied}/${completeness.total}` : "",
      completeness ? completeness.missing.join("; ") : "",
    ];
    lines.push(fields.map((f) => escapeCsvField(String(f))).join(","));
  }

  return lines.join("\r\n");
}
