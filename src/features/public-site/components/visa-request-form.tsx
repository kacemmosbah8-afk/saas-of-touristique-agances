"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, X } from "lucide-react";
import type { DocumentCategory } from "@prisma/client";
import type { CountryCode } from "libphonenumber-js";

import { createVisaRequestAction } from "@/features/visa-requests/actions/create-visa-request.action";
import { analyzeImageQuality } from "@/features/public-site/lib/image-quality";
import { normalizePhoneNumber } from "@/shared/schemas/phone.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { interpolate, type Dictionary, type Locale } from "@/shared/i18n/dictionary";
import { getCountryOptions } from "@/shared/lib/reference-data";

const SELECT_CLASS =
  "border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm dark:bg-input/30";

const VISA_TYPES = ["TOURIST", "BUSINESS", "TRANSIT", "STUDENT", "WORK", "FAMILY_VISIT", "MEDICAL", "OTHER"] as const;

const MAX_DOCUMENTS = 3;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type PendingDocument = {
  file: File;
  category: DocumentCategory;
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

export function VisaRequestForm({ tenantSlug, locale, dict, whatsapp, businessHours }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [travelerCount, setTravelerCount] = useState(1);
  const [destinationCountry, setDestinationCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [visaType, setVisaType] = useState<string>("");
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [travelStartValue, setTravelStartValue] = useState("");

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
  const hasPassportDocument = documents.some((d) => d.category === "PASSPORT");

  // Object URLs are only released when a document is removed or the form
  // unmounts — never revoked mid-life since the <img> preview needs them.
  useEffect(() => {
    return () => {
      for (const doc of documents) {
        if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkPhone(value: string) {
    if (!value.trim()) {
      setPhoneError(null);
      return;
    }
    const valid = normalizePhoneNumber(value, (nationality || undefined) as CountryCode | undefined);
    setPhoneError(valid ? null : dict.visaAssistance.invalidPhone);
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (documents.length + files.length > MAX_DOCUMENTS) {
      setError(dict.visaAssistance.tooManyFiles);
      return;
    }
    for (const file of files) {
      if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
        setError(dict.visaAssistance.unsupportedFileType);
        return;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        setError(dict.visaAssistance.fileTooLarge);
        return;
      }
    }

    setError(null);
    setIsCheckingFiles(true);
    try {
      const checked: PendingDocument[] = [];
      for (const file of files) {
        if (file.type === "application/pdf") {
          checked.push({
            file,
            category: "PASSPORT",
            previewUrl: null,
            qualityNotes: dict.visaAssistance.pdfQualityNotChecked,
          });
          continue;
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
          setError(interpolate(dict.visaAssistance.documentRejected, { name: file.name, reason: result.reason ?? "" }));
          setIsCheckingFiles(false);
          return;
        }
        checked.push({
          file,
          category: "PASSPORT",
          previewUrl: URL.createObjectURL(file),
          qualityNotes: result.notes,
        });
      }
      setDocuments((prev) => [...prev, ...checked]);
    } finally {
      setIsCheckingFiles(false);
    }
  }

  function removeDocument(index: number) {
    setDocuments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateDocumentCategory(index: number, category: DocumentCategory) {
    setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, category } : doc)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!hasPassportDocument) {
      setError(dict.visaAssistance.passportRequired);
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
        },
        documents.map((d) => ({ file: d.file, category: d.category, qualityNotes: d.qualityNotes })),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot — see booking-request-form.tsx for why `display:none`. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field blank
          <input name="hp_check" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

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

      <div className="space-y-3 border-t pt-4">
        <h2 className="font-serif text-lg font-semibold">{dict.visaAssistance.documentsSectionTitle}</h2>
        <p className="text-muted-foreground text-sm">{dict.visaAssistance.documentsHint}</p>
        <p className="text-muted-foreground text-xs">{dict.visaAssistance.qualityLimitationNote}</p>

        {documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map((doc, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
                {doc.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview URL, not an optimizable remote asset
                  <img
                    src={doc.previewUrl}
                    alt={doc.file.name}
                    className="size-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <FileText className="text-muted-foreground size-8 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{doc.file.name}</p>
                  <p className="text-muted-foreground text-xs">{doc.qualityNotes}</p>
                </div>
                <select
                  value={doc.category}
                  onChange={(e) => updateDocumentCategory(i, e.target.value as DocumentCategory)}
                  disabled={busy}
                  className={`${SELECT_CLASS} h-8 w-auto`}
                >
                  <option value="PASSPORT">{dict.visaAssistance.documentCategoryPassport}</option>
                  <option value="IMAGE">{dict.visaAssistance.documentCategoryPhoto}</option>
                  <option value="OTHER">{dict.visaAssistance.documentCategoryOther}</option>
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => removeDocument(i)}
                  aria-label={dict.visaAssistance.removeFile}
                  disabled={busy}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!hasPassportDocument && (
          <p className="text-muted-foreground text-xs">{dict.visaAssistance.passportRequiredHint}</p>
        )}

        {documents.length < MAX_DOCUMENTS && (
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFilesSelected}
            disabled={busy}
          />
        )}
        {isCheckingFiles && <p className="text-muted-foreground text-xs">{dict.visaAssistance.checkingFiles}</p>}
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

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {isPending ? dict.visaAssistance.sending : dict.visaAssistance.sendButton}
      </Button>
    </form>
  );
}
