"use server";

import { revalidatePath } from "next/cache";

import type { CountryCode } from "libphonenumber-js";

import { prisma, getTenantDb, type TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getDictionary, interpolate } from "@/shared/i18n/dictionary";
import { getClientIp, checkVisaRequestIpRateLimit, checkVisaRequestRateLimit } from "@/shared/lib/rate-limit";
import { isAllowedDocumentType, uploadDocument } from "@/shared/lib/storage/supabase-provider";
import { readImageDimensions } from "@/shared/lib/image-dimensions";
import { normalizePhoneNumber } from "@/shared/schemas/phone.schema";
import {
  publicVisaRequestSchema,
  type PublicVisaRequestInput,
} from "@/features/visa-requests/schemas/visa-request.schema";
import { formatVisaRequestReference } from "@/features/visa-requests/lib/reference";
import {
  resolveDocumentRequirements,
  DOCUMENT_REQUIREMENT_CATALOG,
  MAX_VISA_DOCUMENT_BYTES,
  type DocumentRequirementKey,
} from "@/features/visa-requests/lib/document-requirements";
import type { ActionResult } from "@/shared/types/action-result";

/** A case-independent abuse ceiling, not a per-case document count — a
 * resolved checklist can legitimately need 6-10 documents (sponsored,
 * employed, Schengen case), so this only guards against pathological
 * submissions, unlike the old flat cap of 3. */
const MAX_VISA_DOCUMENTS = 15;
/** Mirrors `image-quality.ts`'s `MIN_PIXELS` — duplicated, not imported,
 * because that module uses browser-only canvas/Image APIs and can't be
 * pulled into server code. This is the authoritative check; the client's
 * is UX (immediate feedback, no round-trip). */
const MIN_IMAGE_PIXELS = 480_000;

export type VisaRequestDocumentInput = {
  file: File;
  /** Which checklist item this file satisfies — the server derives the
   * shared `DocumentCategory` enum value and the persisted human label
   * from `DOCUMENT_REQUIREMENT_CATALOG`/the dictionary itself; a client
   * can request a key but can never supply the category or label
   * directly. */
  requirementKey: DocumentRequirementKey;
  /** Client-computed quality summary (see `image-quality.ts`) — display-only. */
  qualityNotes: string;
};

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextReference(db: TenantDb, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.visaRequest.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatVisaRequestReference(year, count + 1);
}

/**
 * The public "Visa Assistance" storefront — reachable by anonymous
 * visitors, never requires an existing booking (unlike
 * `createBookingRequestAction`, which always names a specific product).
 * Documents are uploaded here directly (not through `/api/upload-document`,
 * which requires a staff session an anonymous visitor never has) by calling
 * the same underlying `uploadDocument` storage function in-process.
 */
export async function createVisaRequestAction(
  tenantSlug: string,
  input: PublicVisaRequestInput,
  documents: VisaRequestDocumentInput[],
): Promise<ActionResult<{ reference: string }>> {
  const locale = await getVisitorLocale();
  const dict = getDictionary(locale);

  const parsed = publicVisaRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? dict.visaAssistance.genericError };
  }

  // Honeypot: report success without writing anything so bots get no signal.
  if (parsed.data.company) {
    return { ok: true, data: { reference: "" } };
  }

  if (documents.length > MAX_VISA_DOCUMENTS) {
    return { ok: false, error: dict.visaAssistance.tooManyFiles };
  }

  // Re-derive the case's document checklist server-side — never trust that
  // the client only sent what its own (JS-controlled) checklist rendering
  // asked for. This is defense in depth: the client already only lets the
  // visitor pick from the resolved checklist's slots, but a tampered
  // request could send anything.
  const checklist = resolveDocumentRequirements({
    destinationCountry: parsed.data.destinationCountry,
    countryOfResidence: parsed.data.countryOfResidence,
    purposeOfTravel: parsed.data.purposeOfTravel,
    employmentStatus: parsed.data.employmentStatus,
    accommodationType: parsed.data.accommodationType,
    payerType: parsed.data.payerType,
    hasPreviousTravel: parsed.data.hasPreviousTravel,
  });
  const allowedKeys = new Set<DocumentRequirementKey>([
    ...checklist.requirements.map((r) => r.key),
    "OTHER_CASE_SPECIFIC", // always allowed as the case-specific catch-all
  ]);

  const seenKeys = new Set<DocumentRequirementKey>();
  for (const { requirementKey } of documents) {
    if (!allowedKeys.has(requirementKey)) {
      return { ok: false, error: dict.visaAssistance.unrecognizedDocument };
    }
    if (seenKeys.has(requirementKey)) {
      return { ok: false, error: dict.visaAssistance.duplicateDocumentForRequirement };
    }
    seenKeys.add(requirementKey);
  }

  const missingRequired = checklist.requirements.filter(
    (r) => r.status === "REQUIRED" && !seenKeys.has(r.key),
  );
  if (missingRequired.length > 0) {
    const labels = missingRequired
      .map((r) => dict.visaAssistance.requirements[r.key].label)
      .join(dict.visaAssistance.listSeparator);
    return {
      ok: false,
      error: interpolate(dict.visaAssistance.missingRequiredDocuments, { documents: labels }),
    };
  }

  // Buffered once here so both the type/size checks and the dimension
  // re-check below share the same read — an anonymous endpoint shouldn't
  // read attacker-controlled file bytes more than once per validation pass.
  const buffered: {
    file: File;
    requirementKey: DocumentRequirementKey;
    qualityNotes: string;
    dimensions: { width: number; height: number } | null;
  }[] = [];
  for (const { file, requirementKey, qualityNotes } of documents) {
    if (!isAllowedDocumentType(file.type)) {
      return { ok: false, error: dict.visaAssistance.unsupportedFileType };
    }
    if (file.size > MAX_VISA_DOCUMENT_BYTES) {
      return { ok: false, error: dict.visaAssistance.fileTooLarge };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = readImageDimensions(buffer, file.type);
    // Only enforced for formats the server can actually measure (PNG/JPEG)
    // — a bypass here still has to clear the client's richer checks for
    // every format the client CAN measure, and staff review everything
    // regardless.
    if (dimensions && dimensions.width * dimensions.height < MIN_IMAGE_PIXELS) {
      return { ok: false, error: dict.visaAssistance.qualityLowResolution };
    }
    buffered.push({ file, requirementKey, qualityNotes, dimensions });
  }

  const ip = await getClientIp();
  const ipLimit = await checkVisaRequestIpRateLimit(ip);
  if (!ipLimit.allowed) {
    return { ok: false, error: dict.visaAssistance.rateLimited };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return { ok: false, error: dict.visaAssistance.genericError };

  if (parsed.data.email) {
    const emailLimit = await checkVisaRequestRateLimit(tenant.id, parsed.data.email);
    if (!emailLimit.allowed) {
      return { ok: false, error: dict.visaAssistance.rateLimited };
    }
  }

  const db = getTenantDb(tenant.id);

  // Already proven to parse by the schema's superRefine — re-derive the
  // normalized E.164 form to actually store (Zod validates, it doesn't
  // transform in place here).
  const normalizedPhone = normalizePhoneNumber(parsed.data.phone, parsed.data.nationality as CountryCode);
  if (!normalizedPhone) return { ok: false, error: dict.visaAssistance.genericError };

  // Best-effort — a typo or unmatched reference never blocks submission.
  let bookingId: string | null = null;
  if (parsed.data.bookingReference) {
    const booking = await db.booking.findFirst({
      where: { tenantId: tenant.id, reference: parsed.data.bookingReference },
      select: { id: true },
    });
    bookingId = booking?.id ?? null;
  }

  const reference = await nextReference(db, tenant.id);

  const visaRequest = await db.visaRequest.create({
    data: {
      tenantId: tenant.id,
      reference,
      destinationCountry: parsed.data.destinationCountry,
      nationality: parsed.data.nationality,
      visaType: parsed.data.visaType,
      travelStartDate: parseDate(parsed.data.travelStartDate || undefined),
      travelEndDate: parseDate(parsed.data.travelEndDate || undefined),
      travelerCount: parsed.data.travelerCount,
      countryOfResidence: parsed.data.countryOfResidence,
      purposeOfTravel: parsed.data.purposeOfTravel,
      employmentStatus: parsed.data.employmentStatus,
      accommodationType: parsed.data.accommodationType,
      payerType: parsed.data.payerType,
      payerName: parsed.data.payerName || null,
      payerRelationship: parsed.data.payerRelationship || null,
      hostName: parsed.data.hostName || null,
      hostRelationship: parsed.data.hostRelationship || null,
      hasPreviousTravel: parsed.data.hasPreviousTravel,
      previousTravelNotes: parsed.data.previousTravelNotes || null,
      fullName: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: normalizedPhone,
      whatsapp: parsed.data.whatsapp || null,
      notes: parsed.data.notes || null,
      bookingId,
      travellers: {
        create: parsed.data.travellers.map((traveller, index) => ({
          tenantId: tenant.id,
          order: index,
          firstName: traveller.firstName,
          lastName: traveller.lastName,
          dateOfBirth: parseDate(traveller.dateOfBirth || undefined),
          nationality: traveller.nationality,
          passportNumber: traveller.passportNumber,
          passportIssuingCountry: traveller.passportIssuingCountry,
          passportIssueDate: parseDate(traveller.passportIssueDate || undefined),
          // Already validated as a well-formed ISO date by the schema.
          passportExpiry: new Date(traveller.passportExpiry),
        })),
      },
    },
    select: { id: true, reference: true },
  });

  for (const { file, requirementKey, qualityNotes, dimensions } of buffered) {
    try {
      const { key, url } = await uploadDocument(file, `visa-requests/${tenant.id}`);
      await db.visaRequestDocument.create({
        data: {
          tenantId: tenant.id,
          visaRequestId: visaRequest.id,
          // Derived server-side from the catalog + current dictionary —
          // never taken from client input (see `VisaRequestDocumentInput`'s
          // comment). `requirementLabel` snapshots the label at submission
          // time so relabeling the catalog later never rewrites history.
          category: DOCUMENT_REQUIREMENT_CATALOG[requirementKey].category,
          requirementKey,
          requirementLabel: dict.visaAssistance.requirements[requirementKey].label,
          fileKey: key,
          url,
          mimeType: file.type || null,
          sizeBytes: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          qualityNotes: qualityNotes || null,
        },
      });
    } catch (err) {
      // A failed upload never rolls back the request itself — the visitor
      // already has a reference to follow up with, and staff can ask them
      // to resend the document. Silently dropping it with no trace would be
      // worse than logging it and moving on.
      logger.error("visa request document upload failed", {
        tenantId: tenant.id,
        visaRequestId: visaRequest.id,
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  await db.visaRequestActivity.create({
    data: {
      tenantId: tenant.id,
      visaRequestId: visaRequest.id,
      userId: null,
      type: "CREATED",
      title: "Visa assistance request submitted from website",
      description: `${parsed.data.destinationCountry} — ${parsed.data.visaType} (${parsed.data.travelerCount} traveler(s)) · ${parsed.data.purposeOfTravel} · ${parsed.data.employmentStatus} · ${parsed.data.accommodationType} · payer: ${parsed.data.payerType}`,
    },
  });

  await db.auditLog.create({
    data: {
      userId: null,
      action: "create",
      entity: "visa_request",
      entityId: visaRequest.id,
      metadata: { source: "public_visa_request", email: parsed.data.email },
    },
  });

  logger.info("public visa request created", { tenantId: tenant.id, visaRequestId: visaRequest.id });
  revalidatePath(`/${tenantSlug}/admin/visa-requests`);
  return { ok: true, data: { reference: visaRequest.reference } };
}
