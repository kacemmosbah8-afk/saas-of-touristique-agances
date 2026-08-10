import Link from "next/link";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";
import type { DocumentCategory } from "@prisma/client";

import type { VisaRequestDetail as VisaRequestDetailData } from "@/features/visa-requests/queries/get-visa-request.query";
import { VisaRequestStatusBadge } from "@/features/visa-requests/components/visa-request-status-badge";
import { VisaRequestStatusActions } from "@/features/visa-requests/components/visa-request-status-actions";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary, type AdminDictionary } from "@/shared/i18n/admin-dictionary";
import { getCountryOptions } from "@/shared/lib/reference-data";

function documentCategoryLabel(dict: AdminDictionary["visaRequests"]): Record<DocumentCategory, string> {
  return {
    PASSPORT: dict.documentCategoryPassport,
    IMAGE: dict.documentCategoryImage,
    PDF: dict.documentCategoryPdf,
    VISA: dict.documentCategoryVisa,
    CONTRACT: dict.documentCategoryContract,
    INSURANCE: dict.documentCategoryInsurance,
    NATIONAL_ID: dict.documentCategoryNationalId,
    VACCINATION: dict.documentCategoryVaccination,
    OTHER: dict.documentCategoryOther,
  };
}

type Props = {
  tenantId: string;
  tenantSlug: string;
  visaRequest: VisaRequestDetailData;
  canEdit: boolean;
  locale: Locale;
};

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

function countryLabel(locale: Locale, code: string): string {
  if (locale !== "ar" && locale !== "fr") return code;
  return getCountryOptions(locale).find((c) => c.value === code)?.label ?? code;
}

export function VisaRequestDetail({ tenantId, tenantSlug, visaRequest, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).visaRequests;
  const common = getAdminDictionary(locale).common;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/visa-requests`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tabular-nums">{visaRequest.reference}</h1>
          <VisaRequestStatusBadge status={visaRequest.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {visaRequest.fullName} · {countryLabel(locale, visaRequest.destinationCountry)}
        </p>
      </div>

      {visaRequest.status === "APPROVED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            {dict.approvedOn} {formatDate(visaRequest.approvedAt)}
          </p>
        </div>
      )}

      {visaRequest.status === "REJECTED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            {dict.rejectedOn} {formatDate(visaRequest.rejectedAt)}
            {visaRequest.rejectReason ? ` — ${visaRequest.rejectReason}` : ""}
          </p>
        </div>
      )}

      {visaRequest.status === "CANCELLED" && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">
            {dict.cancelledOn} {formatDate(visaRequest.cancelledAt)}
            {visaRequest.cancelReason ? ` — ${visaRequest.cancelReason}` : ""}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.requestSection}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={dict.destinationLabel} value={countryLabel(locale, visaRequest.destinationCountry)} />
              <Row label={dict.nationalityLabel} value={countryLabel(locale, visaRequest.nationality)} />
              <Row label={dict.visaTypeLabel} value={visaRequest.visaType} />
              <Row label={dict.travelStartDate} value={formatDate(visaRequest.travelStartDate)} />
              <Row label={dict.travelEndDate} value={formatDate(visaRequest.travelEndDate)} />
              <Row label={dict.pax} value={String(visaRequest.travelerCount)} />
              {visaRequest.bookingId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.bookingLinked}</dt>
                  <dd>
                    <Link
                      href={`/${tenantSlug}/admin/bookings/${visaRequest.bookingId}`}
                      className="inline-flex items-center gap-1 underline"
                    >
                      {visaRequest.bookingReference}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.contactSection}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={dict.fullName} value={visaRequest.fullName} />
              <Row label={common.email} value={visaRequest.email ?? "—"} />
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{dict.phone}</dt>
                <dd className="text-end">
                  <span className="font-mono">{visaRequest.phone}</span>
                  <br />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    {dict.phoneFormatValidated}
                  </span>
                  {" · "}
                  <span className="text-muted-foreground text-xs">
                    {visaRequest.phoneVerifiedAt ? dict.phoneVerified : dict.phoneNotVerified}
                  </span>
                </dd>
              </div>
              <Row label={dict.whatsapp} value={visaRequest.whatsapp ?? "—"} />
              {visaRequest.customerId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.customerRecord}</dt>
                  <dd>
                    <Link href={`/${tenantSlug}/admin/customers/${visaRequest.customerId}`} className="underline">
                      {visaRequest.customerName}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.travelersSection}</h2>
            <div className="space-y-4">
              {visaRequest.travellers.map((t) => (
                <dl key={t.id} className="space-y-2 border-t pt-3 text-sm first:border-t-0 first:pt-0">
                  <Row label={dict.travellerName} value={`${t.firstName} ${t.lastName}`} />
                  <Row label={dict.dateOfBirth} value={formatDate(t.dateOfBirth)} />
                  <Row label={dict.nationalityLabel} value={countryLabel(locale, t.nationality)} />
                  <Row label={dict.passportNumber} value={t.passportNumber} />
                  <Row
                    label={dict.passportIssuingCountry}
                    value={countryLabel(locale, t.passportIssuingCountry)}
                  />
                  <Row label={dict.passportIssueDate} value={formatDate(t.passportIssueDate)} />
                  <Row label={dict.passportExpiry} value={formatDate(t.passportExpiry)} />
                </dl>
              ))}
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.documentsSection}</h2>
            {visaRequest.documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">{dict.noDocuments}</p>
            ) : (
              <ul className="space-y-3">
                {visaRequest.documents.map((doc) => (
                  <li key={doc.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm underline"
                    >
                      <FileText className="size-4 shrink-0" />
                      {dict.documentDownload}
                      <ExternalLink className="size-3.5" />
                    </a>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {documentCategoryLabel(dict)[doc.category]}
                      {doc.width && doc.height ? ` · ${doc.width}×${doc.height}` : ""}
                      {doc.qualityNotes ? ` · ${doc.qualityNotes}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {visaRequest.notes && (
            <section>
              <h2 className="mb-1 text-sm font-medium">{dict.notesFromTraveler}</h2>
              <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {visaRequest.notes}
              </p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.actions}</h2>
            {canEdit ? (
              <VisaRequestStatusActions
                tenantId={tenantId}
                visaRequestId={visaRequest.id}
                status={visaRequest.status}
                email={visaRequest.email}
                phone={visaRequest.phone}
                whatsapp={visaRequest.whatsapp}
                locale={locale}
              />
            ) : (
              <VisaRequestStatusBadge status={visaRequest.status} />
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">{dict.timeline}</h2>
            <ol className="space-y-2">
              {visaRequest.activities.map((a) => (
                <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">{a.description}</p>
                  )}
                  <p className="text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
