"use server";

import { revalidatePath } from "next/cache";

import type { CountryCode } from "libphonenumber-js";

import { prisma, getTenantDb, type TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getDictionary } from "@/shared/i18n/dictionary";
import { getClientIp, checkVisaRequestIpRateLimit, checkVisaRequestRateLimit } from "@/shared/lib/rate-limit";
import { isAllowedDocumentType, uploadDocument } from "@/shared/lib/storage/supabase-provider";
import { readImageDimensions } from "@/shared/lib/image-dimensions";
import { normalizePhoneNumber } from "@/shared/schemas/phone.schema";
import {
  publicVisaRequestSchema,
  type PublicVisaRequestInput,
} from "@/features/visa-requests/schemas/visa-request.schema";
import { formatVisaRequestReference } from "@/features/visa-requests/lib/reference";
import type { ActionResult } from "@/shared/types/action-result";
import type { DocumentCategory } from "@prisma/client";

/** Deliberately tighter than the 16MB staff-upload cap — an anonymous,
 * unauthenticated submission gets a smaller allowance, and 3 files at this
 * size comfortably fit under Vercel's serverless request-body ceiling. */
const MAX_VISA_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_VISA_DOCUMENTS = 3;
/** Mirrors `image-quality.ts`'s `MIN_PIXELS` — duplicated, not imported,
 * because that module uses browser-only canvas/Image APIs and can't be
 * pulled into server code. This is the authoritative check; the client's
 * is UX (immediate feedback, no round-trip). */
const MIN_IMAGE_PIXELS = 480_000;

export type VisaRequestDocumentInput = {
  file: File;
  category: DocumentCategory;
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
  const dict = getDictionary(await getVisitorLocale());

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
  if (!documents.some((d) => d.category === "PASSPORT")) {
    return { ok: false, error: dict.visaAssistance.passportRequired };
  }

  // Buffered once here so both the type/size checks and the dimension
  // re-check below share the same read — an anonymous endpoint shouldn't
  // read attacker-controlled file bytes more than once per validation pass.
  const buffered: {
    file: File;
    category: DocumentCategory;
    qualityNotes: string;
    dimensions: { width: number; height: number } | null;
  }[] = [];
  for (const { file, category, qualityNotes } of documents) {
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
    buffered.push({ file, category, qualityNotes, dimensions });
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

  for (const { file, category, qualityNotes, dimensions } of buffered) {
    try {
      const { key, url } = await uploadDocument(file, `visa-requests/${tenant.id}`);
      await db.visaRequestDocument.create({
        data: {
          tenantId: tenant.id,
          visaRequestId: visaRequest.id,
          category,
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
      description: `${parsed.data.destinationCountry} — ${parsed.data.visaType} (${parsed.data.travelerCount} traveler(s))`,
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
