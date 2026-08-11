import Link from "next/link";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";
import type { DocumentCategory } from "@prisma/client";

import type { VisaRequestDetail as VisaRequestDetailData } from "@/features/visa-requests/queries/get-visa-request.query";
import {
  computeVisaRequestCompleteness,
  resolveVisaRequestChecklist,
  LEGACY_NO_QUESTIONNAIRE,
} from "@/features/visa-requests/queries/get-visa-request.query";
import type { DocumentRequirementKey } from "@/features/visa-requests/lib/document-requirements";
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

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function countryLabel(locale: Locale, code: string): string {
  if (locale !== "ar" && locale !== "fr") return code;
  return getCountryOptions(locale).find((c) => c.value === code)?.label ?? code;
}

export function VisaRequestDetail({ tenantId, tenantSlug, visaRequest, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).visaRequests;
  const common = getAdminDictionary(locale).common;

  const purposeLabel: Record<NonNullable<VisaRequestDetailData["purposeOfTravel"]>, string> = {
    TOURISM: dict.purposeTourism,
    BUSINESS: dict.purposeBusiness,
    FAMILY_VISIT: dict.purposeFamilyVisit,
    STUDY: dict.purposeStudy,
    WORK: dict.purposeWork,
    MEDICAL: dict.purposeMedical,
    TRANSIT: dict.purposeTransit,
    OTHER: dict.purposeOther,
  };
  const employmentStatusLabel: Record<NonNullable<VisaRequestDetailData["employmentStatus"]>, string> = {
    EMPLOYED: dict.employmentStatusEmployed,
    SELF_EMPLOYED: dict.employmentStatusSelfEmployed,
    STUDENT: dict.employmentStatusStudent,
    RETIRED: dict.employmentStatusRetired,
    UNEMPLOYED: dict.employmentStatusUnemployed,
    OTHER: dict.employmentStatusOther,
  };
  const accommodationTypeLabel: Record<NonNullable<VisaRequestDetailData["accommodationType"]>, string> = {
    HOTEL: dict.accommodationTypeHotel,
    HOSTED_BY_FAMILY_OR_FRIEND: dict.accommodationTypeHostedByFamilyOrFriend,
    OWN_PROPERTY: dict.accommodationTypeOwnProperty,
    OTHER: dict.accommodationTypeOther,
  };
  const payerTypeLabel: Record<NonNullable<VisaRequestDetailData["payerType"]>, string> = {
    SELF: dict.payerTypeSelf,
    SPONSOR: dict.payerTypeSponsor,
    EMPLOYER: dict.payerTypeEmployer,
  };
  const requirementStatusLabel = {
    REQUIRED: dict.requirementStatusRequired,
    OPTIONAL: dict.requirementStatusOptional,
    IF_APPLICABLE: dict.requirementStatusIfApplicable,
  };

  const checklist = resolveVisaRequestChecklist(visaRequest);
  const completeness = computeVisaRequestCompleteness(visaRequest);
  const documentsByRequirement = new Map(
    visaRequest.documents
      .filter((d) => d.requirementKey)
      .map((d) => [d.requirementKey as DocumentRequirementKey, d]),
  );
  const otherDocuments = visaRequest.documents.filter(
    (d) => !d.requirementKey || (checklist && !checklist.requirements.some((r) => r.key === d.requirementKey)),
  );

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
            <h2 className="mb-3 text-sm font-medium">{dict.caseDetailsSection}</h2>
            <dl className="space-y-2 text-sm">
              <Row
                label={dict.countryOfResidenceLabel}
                value={visaRequest.countryOfResidence ? countryLabel(locale, visaRequest.countryOfResidence) : dict.notCollectedLegacy}
              />
              <Row
                label={dict.purposeOfTravelLabel}
                value={visaRequest.purposeOfTravel ? purposeLabel[visaRequest.purposeOfTravel] : dict.notCollectedLegacy}
              />
              <Row
                label={dict.employmentStatusLabel}
                value={visaRequest.employmentStatus ? employmentStatusLabel[visaRequest.employmentStatus] : dict.notCollectedLegacy}
              />
              <Row
                label={dict.accommodationTypeLabel}
                value={visaRequest.accommodationType ? accommodationTypeLabel[visaRequest.accommodationType] : dict.notCollectedLegacy}
              />
              {visaRequest.hostName && (
                <>
                  <Row label={dict.hostNameLabel} value={visaRequest.hostName} />
                  <Row label={dict.hostRelationshipLabel} value={visaRequest.hostRelationship ?? "—"} />
                </>
              )}
              <Row
                label={dict.payerTypeLabel}
                value={visaRequest.payerType ? payerTypeLabel[visaRequest.payerType] : dict.notCollectedLegacy}
              />
              {visaRequest.payerName && (
                <>
                  <Row label={dict.payerNameLabel} value={visaRequest.payerName} />
                  <Row label={dict.payerRelationshipLabel} value={visaRequest.payerRelationship ?? "—"} />
                </>
              )}
              <Row label={dict.hasPreviousTravelLabel} value={visaRequest.hasPreviousTravel ? dict.yes : dict.no} />
              {visaRequest.previousTravelNotes && (
                <Row label={dict.previousTravelNotesLabel} value={visaRequest.previousTravelNotes} />
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

            {completeness === LEGACY_NO_QUESTIONNAIRE || !checklist ? (
              <p className="text-muted-foreground mb-3 text-xs">{dict.notCollectedLegacy}</p>
            ) : (
              <div className="mb-4 space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  {dict.requiredDocsUploadedLabel
                    .replace("{satisfied}", String(completeness.requiredSatisfied))
                    .replace("{total}", String(completeness.requiredTotal))}
                </p>
                <p className="text-muted-foreground text-xs">
                  {dict.technicalChecksPassedLabel.replace(
                    "{count}",
                    String(visaRequest.documents.filter((d) => d.width && d.height).length),
                  )}
                </p>
                <p className="text-muted-foreground text-xs font-medium">{dict.finalReviewRequiredLabel}</p>
              </div>
            )}

            {checklist ? (
              <ul className="space-y-3">
                {checklist.requirements.map((req) => {
                  const doc = documentsByRequirement.get(req.key);
                  return (
                    <li key={req.key} className="border-t pt-2 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{dict.requirementLabels[req.key]}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            req.status === "REQUIRED"
                              ? "bg-destructive/10 text-destructive"
                              : req.status === "OPTIONAL"
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {requirementStatusLabel[req.status]}
                        </span>
                      </div>
                      {doc ? (
                        <div className="mt-1 text-xs">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 underline"
                          >
                            <FileText className="size-3.5 shrink-0" />
                            {dict.documentDownload}
                            <ExternalLink className="size-3" />
                          </a>
                          <p className="text-muted-foreground mt-0.5">
                            {dict.uploadedAtLabel}: {formatDateTime(doc.createdAt)}
                            {doc.width && doc.height ? ` · ${doc.width}×${doc.height}` : ""}
                            {!doc.width && doc.mimeType === "application/pdf" ? ` · ${dict.notCheckedPdf}` : ""}
                            {doc.qualityNotes ? ` · ${doc.qualityNotes}` : ""}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground mt-1 text-xs">{dict.notProvided}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : visaRequest.documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">{dict.noDocuments}</p>
            ) : null}

            {otherDocuments.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <h3 className="text-muted-foreground mb-2 text-xs font-medium">{dict.otherUploadedFilesSection}</h3>
                <ul className="space-y-3">
                  {otherDocuments.map((doc) => (
                    <li key={doc.id} className="border-t pt-2 text-xs first:border-t-0 first:pt-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 underline"
                      >
                        <FileText className="size-3.5 shrink-0" />
                        {doc.requirementLabel ?? dict.documentDownload}
                        <ExternalLink className="size-3" />
                      </a>
                      <p className="text-muted-foreground mt-0.5">
                        {documentCategoryLabel(dict)[doc.category]} · {dict.uploadedAtLabel}: {formatDateTime(doc.createdAt)}
                        {doc.width && doc.height ? ` · ${doc.width}×${doc.height}` : ""}
                        {doc.qualityNotes ? ` · ${doc.qualityNotes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">{dict.disclaimerVariesByCase}</p>
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
