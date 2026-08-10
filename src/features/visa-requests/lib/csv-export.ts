import type { Locale } from "@/shared/i18n/dictionary";
import { VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";
import { getCountryOptions } from "@/shared/lib/reference-data";
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
  "Document count",
  "Document categories",
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

export function buildVisaRequestsCsv(rows: VisaRequestExportRow[], locale: Locale): string {
  const lines = [COLUMNS.join(",")];

  for (const row of rows) {
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
      String(row.documents.length),
      row.documents.map((d) => d.category).join("; "),
    ];
    lines.push(fields.map((f) => escapeCsvField(String(f))).join(","));
  }

  return lines.join("\r\n");
}
