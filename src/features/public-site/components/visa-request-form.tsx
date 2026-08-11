"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, X } from "lucide-react";
import type {
  VisaAccommodationType,
  VisaEmploymentStatus,
  VisaPayerType,
  VisaTravelPurpose,
} from "@prisma/client";
import type { CountryCode } from "libphonenumber-js";

import { createVisaRequestAction } from "@/features/visa-requests/actions/create-visa-request.action";
import { analyzeImageQuality } from "@/features/public-site/lib/image-quality";
import { normalizePhoneNumber } from "@/shared/schemas/phone.schema";
import {
  resolveDocumentRequirements,
  type DocumentRequirementKey,
  type ResolvedChecklist,
} from "@/features/visa-requests/lib/document-requirements";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { interpolate, type Dictionary, type Locale } from "@/shared/i18n/dictionary";
import { getCountryOptions } from "@/shared/lib/reference-data";

const SELECT_CLASS =
  "border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm dark:bg-input/30";

const VISA_TYPES = ["TOURIST", "BUSINESS", "TRANSIT", "STUDENT", "WORK", "FAMILY_VISIT", "MEDICAL", "OTHER"] as const;

/** 1:1 mapping from the public "visa type" select to the questionnaire's
 * `purposeOfTravel` enum — kept as its own question would be redundant, but
 * the server can't reverse a free-text, localized `visaType` label back
 * into the enum, so the client sends both. */
const VISA_TYPE_TO_PURPOSE: Record<(typeof VISA_TYPES)[number], VisaTravelPurpose> = {
  TOURIST: "TOURISM",
  BUSINESS: "BUSINESS",
  TRANSIT: "TRANSIT",
  STUDENT: "STUDY",
  WORK: "WORK",
  FAMILY_VISIT: "FAMILY_VISIT",
  MEDICAL: "MEDICAL",
  OTHER: "OTHER",
};

const EMPLOYMENT_STATUSES: VisaEmploymentStatus[] = ["EMPLOYED", "SELF_EMPLOYED", "STUDENT", "RETIRED", "UNEMPLOYED", "OTHER"];
const ACCOMMODATION_TYPES: VisaAccommodationType[] = ["HOTEL", "HOSTED_BY_FAMILY_OR_FRIEND", "OWN_PROPERTY", "OTHER"];
const PAYER_TYPES: VisaPayerType[] = ["SELF", "SPONSOR", "EMPLOYER"];

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", ...ALLOWED_IMAGE_TYPES]);

type PendingDocument = {
  file: File;
  /** Object URL for an image preview — null for PDFs (no in-browser PDF renderer). */
  previewUrl: string | null;
  qualityNotes: string;
};

type Props = {
  tenantSlug: string;
  locale: Locale;
  dict: Dictionary;
  whatsapp?: string | null;
  businessHours?: string | null;
};

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function VisaRequestForm({ tenantSlug, locale, dict, whatsapp, businessHours }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [phase, setPhase] = useState<"questionnaire" | "checklist">("questionnaire");
  const [checklist, setChecklist] = useState<ResolvedChecklist | null>(null);

  const [travelerCount, setTravelerCount] = useState(1);
  const [destinationCountry, setDestinationCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [visaType, setVisaType] = useState<string>("");
  const [countryOfResidence, setCountryOfResidence] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<VisaEmploymentStatus | "">("");
  const [accommodationType, setAccommodationType] = useState<VisaAccommodationType | "">("");
  const [payerType, setPayerType] = useState<VisaPayerType | "">("");
  const [hasPreviousTravel, setHasPreviousTravel] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [travelStartValue, setTravelStartValue] = useState("");

  const [slots, setSlots] = useState<Partial<Record<DocumentRequirementKey, PendingDocument>>>({});
  const [appliedToggles, setAppliedToggles] = useState<Set<DocumentRequirementKey>>(new Set());

  const busy = isPending || isCheckingFiles;
  const countryOptions = getCountryOptions(locale);
  const visaTypeLabel: Record<(typeof VISA_TYPES)[number], string> = {
    TOURIST: dict.visaAssistance.visaTypeTourist,
    BUSINESS: dict.visaAssistance.visaTypeBusiness,
    TRANSIT: dict.visaAssistance.visaTypeTransit,
    STUDENT: dict.visaAssistance.visaTypeStudent,
    WORK: dict.visaAssistance.visaTypeWork,
    FAMILY_VISIT: dict.visaAssistance.visaTypeFamilyVisit,
    MEDICAL: dict.visaAssistance.visaTypeMedical,
    OTHER: dict.visaAssistance.visaTypeOther,
  };
  const employmentStatusLabel: Record<VisaEmploymentStatus, string> = {
    EMPLOYED: dict.visaAssistance.employmentStatusEmployed,
    SELF_EMPLOYED: dict.visaAssistance.employmentStatusSelfEmployed,
    STUDENT: dict.visaAssistance.employmentStatusStudent,
    RETIRED: dict.visaAssistance.employmentStatusRetired,
    UNEMPLOYED: dict.visaAssistance.employmentStatusUnemployed,
    OTHER: dict.visaAssistance.employmentStatusOther,
  };
  const accommodationTypeLabel: Record<VisaAccommodationType, string> = {
    HOTEL: dict.visaAssistance.accommodationTypeHotel,
    HOSTED_BY_FAMILY_OR_FRIEND: dict.visaAssistance.accommodationTypeHostedByFamilyOrFriend,
    OWN_PROPERTY: dict.visaAssistance.accommodationTypeOwnProperty,
    OTHER: dict.visaAssistance.accommodationTypeOther,
  };
  const payerTypeLabel: Record<VisaPayerType, string> = {
    SELF: dict.visaAssistance.payerTypeSelf,
    SPONSOR: dict.visaAssistance.payerTypeSponsor,
    EMPLOYER: dict.visaAssistance.payerTypeEmployer,
  };
  const requirementStatusLabel = {
    REQUIRED: dict.visaAssistance.requirementStatusRequired,
    OPTIONAL: dict.visaAssistance.requirementStatusOptional,
    IF_APPLICABLE: dict.visaAssistance.requirementStatusIfApplicable,
  };

  // Object URLs are only released when a slot's file is replaced/removed or
  // the form unmounts — never revoked mid-life since the <img> preview needs them.
  useEffect(() => {
    return () => {
      for (const doc of Object.values(slots)) {
        if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkPhone(value: string): boolean {
    if (!value.trim()) {
      setPhoneError(null);
      return true;
    }
    const valid = normalizePhoneNumber(value, (nationality || undefined) as CountryCode | undefined);
    setPhoneError(valid ? null : dict.visaAssistance.invalidPhone);
    return !!valid;
  }

  function handleContinue() {
    setError(null);
    const form = formRef.current;
    if (!form) return;

    // Phase-2 fields aren't mounted yet, so this only validates the
    // currently-rendered phase-1 fields (destination, nationality, visa
    // type, contact block, case questionnaire, travellers).
    if (!form.reportValidity()) return;

    const phoneValue = String(new FormData(form).get("phone") ?? "");
    if (!checkPhone(phoneValue)) return;

    if (payerType === "SPONSOR" && !String(new FormData(form).get("payerName") ?? "").trim()) {
      setError(dict.visaAssistance.genericError);
      return;
    }
    if (accommodationType === "HOSTED_BY_FAMILY_OR_FRIEND" && !String(new FormData(form).get("hostName") ?? "").trim()) {
      setError(dict.visaAssistance.genericError);
      return;
    }

    const resolved = resolveDocumentRequirements({
      destinationCountry,
      countryOfResidence,
      purposeOfTravel: VISA_TYPE_TO_PURPOSE[visaType as (typeof VISA_TYPES)[number]],
      employmentStatus: employmentStatus as VisaEmploymentStatus,
      accommodationType: accommodationType as VisaAccommodationType,
      payerType: payerType as VisaPayerType,
      hasPreviousTravel,
    });
    setChecklist(resolved);
    setPhase("checklist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSlotFileSelected(key: DocumentRequirementKey, file: File, acceptedFormats: ("IMAGE" | "PDF")[]) {
    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isPdf = file.type === "application/pdf";
    const formatOk = (isImage && acceptedFormats.includes("IMAGE")) || (isPdf && acceptedFormats.includes("PDF"));
    if (!formatOk || !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      setError(dict.visaAssistance.unsupportedFileType);
      return;
    }

    const previous = slots[key];
    setError(null);
    setIsCheckingFiles(true);
    try {
      if (isPdf) {
        if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
        setSlots((prev) => ({
          ...prev,
          [key]: { file, previewUrl: null, qualityNotes: dict.visaAssistance.pdfQualityNotChecked },
        }));
        return;
      }
      const result = await analyzeImageQuality(file, {
        lowResolution: dict.visaAssistance.qualityLowResolution,
        tooDark: dict.visaAssistance.qualityTooDark,
        tooBright: dict.visaAssistance.qualityTooBright,
        tooBlurry: dict.visaAssistance.qualityTooBlurry,
        glare: dict.visaAssistance.qualityGlare,
        cropped: dict.visaAssistance.qualityCropped,
        unreadable: dict.visaAssistance.qualityUnreadable,
      });
      if (!result.ok) {
        setError(
          interpolate(dict.visaAssistance.documentRejectedForRequirement, {
            name: dict.visaAssistance.requirements[key].label,
            reason: result.reason ?? "",
          }),
        );
        return;
      }
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
      setSlots((prev) => ({ ...prev, [key]: { file, previewUrl: URL.createObjectURL(file), qualityNotes: result.notes } }));
    } finally {
      setIsCheckingFiles(false);
    }
  }

  function removeSlotFile(key: DocumentRequirementKey) {
    setSlots((prev) => {
      const removed = prev[key];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleApplies(key: DocumentRequirementKey, applies: boolean) {
    setAppliedToggles((prev) => {
      const next = new Set(prev);
      if (applies) next.add(key);
      else next.delete(key);
      return next;
    });
    if (!applies) removeSlotFile(key);
  }

  const missingRequiredLabels = useMemo(() => {
    if (!checklist) return [];
    return checklist.requirements.filter((r) => r.status === "REQUIRED" && !slots[r.key]).map((r) => dict.visaAssistance.requirements[r.key].label);
  }, [checklist, slots, dict]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!checklist) return;

    if (missingRequiredLabels.length > 0) {
      setError(interpolate(dict.visaAssistance.missingRequiredDocuments, { documents: missingRequiredLabels.join(dict.visaAssistance.listSeparator) }));
      return;
    }

    const form = new FormData(e.currentTarget);
    const phoneValue = String(form.get("phone") ?? "");
    if (!normalizePhoneNumber(phoneValue, (nationality || undefined) as CountryCode | undefined)) {
      setPhoneError(dict.visaAssistance.invalidPhone);
      return;
    }

    const travellers = Array.from({ length: travelerCount }, (_, i) => ({
      firstName: String(form.get(`t${i}-firstName`) ?? ""),
      lastName: String(form.get(`t${i}-lastName`) ?? ""),
      dateOfBirth: String(form.get(`t${i}-dateOfBirth`) ?? ""),
      nationality: String(form.get(`t${i}-nationality`) ?? ""),
      passportNumber: String(form.get(`t${i}-passportNumber`) ?? ""),
      passportIssuingCountry: String(form.get(`t${i}-passportIssuingCountry`) ?? ""),
      passportIssueDate: String(form.get(`t${i}-passportIssueDate`) ?? ""),
      passportExpiry: String(form.get(`t${i}-passportExpiry`) ?? ""),
    }));

    const documents = Object.entries(slots).map(([key, doc]) => ({
      file: doc!.file,
      requirementKey: key as DocumentRequirementKey,
      qualityNotes: doc!.qualityNotes,
    }));

    startTransition(async () => {
      const result = await createVisaRequestAction(
        tenantSlug,
        {
          destinationCountry,
          nationality,
          visaType: visaType ? visaTypeLabel[visaType as (typeof VISA_TYPES)[number]] : "",
          travelStartDate: String(form.get("travelStartDate") ?? ""),
          travelEndDate: String(form.get("travelEndDate") ?? ""),
          travelerCount,
          fullName: String(form.get("fullName") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: phoneValue,
          whatsapp: String(form.get("whatsapp") ?? ""),
          notes: String(form.get("notes") ?? ""),
          bookingReference: String(form.get("bookingReference") ?? ""),
          travellers,
          company: String(form.get("hp_check") ?? ""),
          countryOfResidence,
          purposeOfTravel: VISA_TYPE_TO_PURPOSE[visaType as (typeof VISA_TYPES)[number]],
          employmentStatus: employmentStatus as VisaEmploymentStatus,
          accommodationType: accommodationType as VisaAccommodationType,
          payerType: payerType as VisaPayerType,
          payerName: String(form.get("payerName") ?? ""),
          payerRelationship: String(form.get("payerRelationship") ?? ""),
          hostName: String(form.get("hostName") ?? ""),
          hostRelationship: String(form.get("hostRelationship") ?? ""),
          hasPreviousTravel,
          previousTravelNotes: String(form.get("previousTravelNotes") ?? ""),
        },
        documents,
      );

      if (!result.ok) {
        setError(result.error ?? dict.visaAssistance.genericError);
        return;
      }
      setSubmittedReference(result.data.reference || "received");
    });
  }

  if (submittedReference) {
    const whatsappHref = whatsapp
      ? `https://wa.me/${whatsapp.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(submittedReference)}`
      : null;

    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">{dict.visaAssistance.successTitle}</p>
        <p className="text-muted-foreground mt-1 text-sm">{dict.visaAssistance.successBody}</p>
        <p className="mt-3 text-sm">
          {dict.visaAssistance.referenceLabel}{" "}
          <span className="font-mono font-medium">{submittedReference}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {businessHours
            ? `${dict.visaAssistance.responseWithHours} ${businessHours}.`
            : dict.visaAssistance.responseGeneric}
        </p>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ebe57]"
          >
            {dict.visaAssistance.whatsappFaster}
          </a>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="ghost">
            <Link href={`/${tenantSlug}`}>
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              {dict.nav.home}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot — see booking-request-form.tsx for why `display:none`. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field blank
          <input name="hp_check" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div hidden={phase !== "questionnaire"} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.visaAssistance.destinationLabel}</label>
            <select
              required
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                {dict.visaAssistance.selectPlaceholder}
              </option>
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.visaAssistance.nationalityLabel}</label>
            <select
              required
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                {dict.visaAssistance.selectPlaceholder}
              </option>
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.visaAssistance.visaTypeLabel}</label>
            <select
              required
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                {dict.visaAssistance.selectPlaceholder}
              </option>
              {VISA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {visaTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="travelerCount" className="text-sm font-medium">
              {dict.visaAssistance.travelerCountLabel}
            </label>
            <Input
              id="travelerCount"
              name="travelerCount"
              type="number"
              min={1}
              max={20}
              value={travelerCount}
              onChange={(e) => setTravelerCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              required
              disabled={busy}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="travelStartDate" className="text-sm font-medium">
              {dict.visaAssistance.travelStartDate}{" "}
              <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
            </label>
            <Input
              id="travelStartDate"
              name="travelStartDate"
              type="date"
              min={todayIso}
              onChange={(e) => setTravelStartValue(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="travelEndDate" className="text-sm font-medium">
              {dict.visaAssistance.travelEndDate}{" "}
              <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
            </label>
            <Input
              id="travelEndDate"
              name="travelEndDate"
              type="date"
              min={travelStartValue || todayIso}
              disabled={busy}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium">
              {dict.visaAssistance.fullName}
            </label>
            <Input id="fullName" name="fullName" required maxLength={150} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              {dict.visaAssistance.email}{" "}
              <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
            </label>
            <Input id="email" name="email" type="email" disabled={busy} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              {dict.visaAssistance.phone}
            </label>
            <Input
              id="phone"
              name="phone"
              required
              maxLength={40}
              placeholder={dict.visaAssistance.phonePlaceholder}
              onBlur={(e) => checkPhone(e.target.value)}
              aria-invalid={!!phoneError}
              disabled={busy}
            />
            {phoneError && <p className="text-destructive text-xs">{phoneError}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className="text-sm font-medium">
              {dict.visaAssistance.whatsapp}{" "}
              <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
            </label>
            <Input id="whatsapp" name="whatsapp" maxLength={40} disabled={busy} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bookingReference" className="text-sm font-medium">
            {dict.visaAssistance.bookingReferenceLabel}{" "}
            <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
          </label>
          <Input
            id="bookingReference"
            name="bookingReference"
            maxLength={60}
            placeholder={dict.visaAssistance.bookingReferencePlaceholder}
            disabled={busy}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="font-serif text-lg font-semibold">{dict.visaAssistance.caseDetailsSectionTitle}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{dict.visaAssistance.countryOfResidenceLabel}</label>
              <select
                required
                value={countryOfResidence}
                onChange={(e) => setCountryOfResidence(e.target.value)}
                disabled={busy}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  {dict.visaAssistance.selectPlaceholder}
                </option>
                {countryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{dict.visaAssistance.employmentStatusLabel}</label>
              <select
                required
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as VisaEmploymentStatus)}
                disabled={busy}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  {dict.visaAssistance.selectPlaceholder}
                </option>
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {employmentStatusLabel[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.visaAssistance.accommodationTypeLabel}</label>
            <select
              required
              value={accommodationType}
              onChange={(e) => setAccommodationType(e.target.value as VisaAccommodationType)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                {dict.visaAssistance.selectPlaceholder}
              </option>
              {ACCOMMODATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {accommodationTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>

          {accommodationType === "HOSTED_BY_FAMILY_OR_FRIEND" && (
            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="hostName" className="text-sm font-medium">
                  {dict.visaAssistance.hostNameLabel}
                </label>
                <Input id="hostName" name="hostName" required maxLength={150} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="hostRelationship" className="text-sm font-medium">
                  {dict.visaAssistance.hostRelationshipLabel}
                </label>
                <Input id="hostRelationship" name="hostRelationship" maxLength={120} disabled={busy} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.visaAssistance.payerTypeLabel}</label>
            <select
              required
              value={payerType}
              onChange={(e) => setPayerType(e.target.value as VisaPayerType)}
              disabled={busy}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                {dict.visaAssistance.selectPlaceholder}
              </option>
              {PAYER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {payerTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>

          {payerType === "SPONSOR" && (
            <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="payerName" className="text-sm font-medium">
                  {dict.visaAssistance.payerNameLabel}
                </label>
                <Input id="payerName" name="payerName" required maxLength={150} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="payerRelationship" className="text-sm font-medium">
                  {dict.visaAssistance.payerRelationshipLabel}
                </label>
                <Input id="payerRelationship" name="payerRelationship" maxLength={120} disabled={busy} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={hasPreviousTravel}
                onCheckedChange={(v) => setHasPreviousTravel(v === true)}
                disabled={busy}
              />
              {dict.visaAssistance.hasPreviousTravelLabel}
            </label>
            {hasPreviousTravel && (
              <div className="space-y-1.5">
                <label htmlFor="previousTravelNotes" className="text-sm font-medium">
                  {dict.visaAssistance.previousTravelNotesLabel}
                </label>
                <Textarea
                  id="previousTravelNotes"
                  name="previousTravelNotes"
                  rows={2}
                  maxLength={2000}
                  placeholder={dict.visaAssistance.previousTravelNotesPlaceholder}
                  disabled={busy}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="font-serif text-lg font-semibold">{dict.visaAssistance.travelersSectionTitle}</h2>
          {Array.from({ length: travelerCount }, (_, i) => (
            <fieldset key={i} className="space-y-4 rounded-lg border p-4">
              <legend className="text-sm font-medium">
                {interpolate(dict.visaAssistance.travellerNumberLabel, { n: String(i + 1) })}
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.travellerFirstName}</label>
                  <Input name={`t${i}-firstName`} required maxLength={120} disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.travellerLastName}</label>
                  <Input name={`t${i}-lastName`} required maxLength={120} disabled={busy} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {dict.visaAssistance.dateOfBirth}{" "}
                    <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
                  </label>
                  <Input name={`t${i}-dateOfBirth`} type="date" max={todayIso} disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.travellerNationality}</label>
                  <select
                    name={`t${i}-nationality`}
                    required
                    defaultValue=""
                    disabled={busy}
                    className={SELECT_CLASS}
                  >
                    <option value="" disabled>
                      {dict.visaAssistance.selectPlaceholder}
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.passportNumber}</label>
                  <Input name={`t${i}-passportNumber`} required maxLength={60} disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.passportIssuingCountry}</label>
                  <select
                    name={`t${i}-passportIssuingCountry`}
                    required
                    defaultValue=""
                    disabled={busy}
                    className={SELECT_CLASS}
                  >
                    <option value="" disabled>
                      {dict.visaAssistance.selectPlaceholder}
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {dict.visaAssistance.passportIssueDate}{" "}
                    <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
                  </label>
                  <Input name={`t${i}-passportIssueDate`} type="date" max={todayIso} disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{dict.visaAssistance.passportExpiry}</label>
                  <Input
                    name={`t${i}-passportExpiry`}
                    type="date"
                    min={todayIso}
                    required
                    disabled={busy}
                  />
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            {dict.visaAssistance.notesLabel}{" "}
            <span className="text-muted-foreground font-normal">{dict.visaAssistance.optionalTag}</span>
          </label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            maxLength={2000}
            placeholder={dict.visaAssistance.notesPlaceholder}
            disabled={busy}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="button" onClick={handleContinue} disabled={busy} className="w-full sm:w-auto">
          {dict.visaAssistance.continueToChecklistButton}
        </Button>
      </div>

      {phase === "checklist" && checklist && (
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">{dict.visaAssistance.checklistIntro}</p>
          <p className="bg-muted/50 rounded-lg border p-3 text-xs">{dict.visaAssistance.disclaimerVariesByCase}</p>
          {checklist.isFallback && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {dict.visaAssistance.fallbackUnconfiguredDestinationNote}
            </p>
          )}

          <div className="space-y-4">
            {checklist.requirements.map((req, index) => {
              const meta = dict.visaAssistance.requirements[req.key];
              const doc = slots[req.key];
              const isToggleable = req.status === "IF_APPLICABLE";
              const applied = appliedToggles.has(req.key);
              const showUploadSlot = !isToggleable || applied;

              return (
                <div key={req.key} className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">
                      {interpolate(dict.visaAssistance.checklistStepLabel, { n: String(index + 1), name: meta.label })}
                    </h3>
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
                  <p className="text-muted-foreground text-sm">
                    {dict.visaAssistance.requirementWhyNeededPrefix} {meta.why}
                  </p>
                  <p className="text-muted-foreground text-xs">{meta.instruction}</p>
                  <p className="text-muted-foreground text-xs">
                    {dict.visaAssistance.requirementAcceptedFormatsPrefix} {meta.acceptedFormatsNote} ·{" "}
                    {dict.visaAssistance.requirementMaxSizePrefix} {formatBytes(req.maxSizeBytes)}
                  </p>

                  {isToggleable && (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={applied} onCheckedChange={(v) => toggleApplies(req.key, v === true)} disabled={busy} />
                      {dict.visaAssistance.requirementAppliesToggleLabel}
                    </label>
                  )}

                  {showUploadSlot && (
                    <div className="space-y-2">
                      {doc ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
                          {doc.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- local blob preview URL, not an optimizable remote asset
                            <img src={doc.previewUrl} alt={doc.file.name} className="size-12 shrink-0 rounded object-cover" />
                          ) : (
                            <FileText className="text-muted-foreground size-8 shrink-0" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate">
                              {dict.visaAssistance.requirementUploadedFilenamePrefix} {doc.file.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {doc.qualityNotes} · {dict.visaAssistance.requirementValidationOk}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => removeSlotFile(req.key)}
                            aria-label={dict.visaAssistance.removeFile}
                            disabled={busy}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">{dict.visaAssistance.requirementValidationPending}</p>
                      )}
                      <Input
                        type="file"
                        accept={req.acceptedFormats
                          .flatMap((f) => (f === "IMAGE" ? ["image/jpeg", "image/png", "image/webp", "image/gif"] : ["application/pdf"]))
                          .join(",")}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleSlotFileSelected(req.key, file, req.acceptedFormats);
                        }}
                        disabled={busy}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isCheckingFiles && <p className="text-muted-foreground text-xs">{dict.visaAssistance.checkingFiles}</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => setPhase("questionnaire")} disabled={busy}>
              {dict.visaAssistance.backToQuestionnaireButton}
            </Button>
            <Button type="submit" disabled={busy} className="flex-1 sm:flex-none">
              {isPending ? dict.visaAssistance.sending : dict.visaAssistance.sendButton}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
