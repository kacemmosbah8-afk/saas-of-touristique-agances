"use server";

import { prisma, getTenantDb, type TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getDictionary } from "@/shared/i18n/dictionary";
import {
  publicBookingRequestSchema,
  type PublicBookingRequestInput,
} from "@/features/booking-requests/schemas/booking-request.schema";
import { formatBookingRequestReference } from "@/features/booking-requests/lib/reference";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import type { ActionResult } from "@/shared/types/action-result";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Resolve the chosen product by its public slug — only a published/active product is a valid target. */
async function resolveProduct(
  db: TenantDb,
  productType: PublicBookingRequestInput["productType"],
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  switch (productType) {
    case "PACKAGE":
      return getPackageBySlug(db, slug);
    case "HOTEL":
      return getHotelBySlug(db, slug);
    case "DESTINATION":
      return getDestinationBySlug(db, slug);
    case "ACTIVITY":
      return getActivityBySlug(db, slug);
    case "FLIGHT":
      return getFlightBySlug(db, slug);
    default:
      return null;
  }
}

/**
 * Allocate the next per-tenant reference, mirroring
 * `bookings/actions/booking.action.ts`'s `nextReference`.
 */
async function nextReference(db: TenantDb, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.bookingRequest.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatBookingRequestReference(year, count + 1);
}

/**
 * The public storefront's "Request to Book" pipeline — the real booking
 * request workflow (product spec, Stage 2). Reachable by anonymous
 * visitors, so unlike the admin `booking-request.action.ts` mutations this
 * never calls `requirePermission`; it resolves the tenant from its public
 * slug and writes with `userId: null`, the same non-staff-actor convention
 * `createPublicInquiryAction` uses. The general contact/inquiry form (→
 * Lead) stays available alongside this — this is the "I want to book this
 * specific thing" path.
 */
export async function createBookingRequestAction(
  tenantSlug: string,
  input: PublicBookingRequestInput,
): Promise<ActionResult<{ reference: string }>> {
  // Errors below are shown directly to the visitor, so they're drawn from
  // the same dictionary as the rest of the storefront rather than hardcoded
  // English — a validation typo or a stale link shouldn't be the one place
  // on the site that ignores the visitor's chosen language.
  const dict = getDictionary(await getVisitorLocale());

  const parsed = publicBookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: dict.booking.genericError };
  }

  // Honeypot: report success without writing anything so bots get no signal.
  if (parsed.data.company) {
    return { ok: true, data: { reference: "" } };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) return { ok: false, error: dict.booking.genericError };

  const db = getTenantDb(tenant.id);

  const product = await resolveProduct(db, parsed.data.productType, parsed.data.productSlug);
  if (!product) return { ok: false, error: dict.booking.listingUnavailable };

  const reference = await nextReference(db, tenant.id);

  const bookingRequest = await db.bookingRequest.create({
    data: {
      tenantId: tenant.id,
      reference,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      adults: parsed.data.adults,
      children: parsed.data.children,
      preferredDate: parseDate(parsed.data.preferredDate || undefined),
      returnDate: parseDate(parsed.data.returnDate || undefined),
      productType: parsed.data.productType,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      notes: parsed.data.notes || null,
    },
    select: { id: true, reference: true },
  });

  await db.bookingRequestActivity.create({
    data: {
      tenantId: tenant.id,
      bookingRequestId: bookingRequest.id,
      userId: null,
      type: "CREATED",
      title: "Booking request submitted from website",
      description: `${product.name} (${parsed.data.productType.toLowerCase()})`,
    },
  });

  await db.auditLog.create({
    data: {
      userId: null,
      action: "create",
      entity: "booking_request",
      entityId: bookingRequest.id,
      metadata: { source: "public_booking_request", email: parsed.data.email },
    },
  });

  logger.info("public booking request created", {
    tenantId: tenant.id,
    bookingRequestId: bookingRequest.id,
  });
  return { ok: true, data: { reference: bookingRequest.reference } };
}
