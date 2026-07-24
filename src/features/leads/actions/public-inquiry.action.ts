"use server";

import { prisma, getTenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getDictionary } from "@/shared/i18n/dictionary";
import {
  publicInquirySchema,
  type PublicInquiryInput,
} from "@/features/leads/schemas/public-inquiry.schema";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import { getWorkspaceSettings } from "@/features/settings/queries/settings.query";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * The public storefront's inquiry/contact form → Lead pipeline. Reachable
 * by anonymous visitors, so unlike `createLeadAction` this never calls
 * `requirePermission` — it resolves the tenant from its public slug and
 * writes with `userId: null`, this schema's established convention for a
 * non-staff actor (see `writePortalAudit` in shared/lib/audit.ts). Every
 * inquiry becomes a `Lead` with `source: WEBSITE`, unassigned, for staff to
 * triage from the existing Leads inbox — the visitor never talks to
 * TravelOS, only ever to the agency's own pipeline.
 */
export async function createPublicInquiryAction(
  tenantSlug: string,
  input: PublicInquiryInput,
): Promise<ActionResult> {
  // Shown directly to the visitor, so drawn from the same dictionary as the
  // rest of the storefront — see the equivalent comment in
  // `createBookingRequestAction`.
  const dict = getDictionary(await getVisitorLocale());

  const parsed = publicInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: dict.contact.genericError };
  }

  // Honeypot: a real visitor never fills this in. Bots that autofill every
  // field will — report success without writing anything, so the bot has
  // no signal to learn from and route around.
  if (parsed.data.company) {
    return { ok: true };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return { ok: false, error: dict.contact.genericError };
  }

  const db = getTenantDb(tenant.id);

  const [settings, pkg, hotel, destination, activity, flight] = await Promise.all([
    getWorkspaceSettings(db),
    parsed.data.packageSlug ? getPackageBySlug(db, parsed.data.packageSlug) : null,
    parsed.data.hotelSlug ? getHotelBySlug(db, parsed.data.hotelSlug) : null,
    parsed.data.destinationSlug ? getDestinationBySlug(db, parsed.data.destinationSlug) : null,
    parsed.data.activitySlug ? getActivityBySlug(db, parsed.data.activitySlug) : null,
    parsed.data.flightSlug ? getFlightBySlug(db, parsed.data.flightSlug) : null,
  ]);

  const reference = pkg
    ? { kind: "package", name: pkg.name, path: `packages/${pkg.slug}` }
    : hotel
      ? { kind: "hotel", name: hotel.name, path: `hotels/${hotel.slug}` }
      : destination
        ? { kind: "destination", name: destination.name, path: `destinations/${destination.slug}` }
        : activity
          ? { kind: "activity", name: activity.name, path: `activities/${activity.slug}` }
          : flight
            ? { kind: "flight", name: flight.name, path: `flights/${flight.slug}` }
            : null;

  const title = reference
    ? `Website inquiry — ${reference.name}`
    : `Website inquiry from ${parsed.data.name}`;
  const notes = [
    parsed.data.message || null,
    reference
      ? `Regarding ${reference.kind}: ${reference.name} (/${tenantSlug}/${reference.path})`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lead = await db.lead.create({
    data: {
      tenantId: tenant.id,
      title,
      contactName: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      source: "WEBSITE",
      currency: settings.defaultCurrency,
      notes: notes || null,
    },
    select: { id: true },
  });

  await db.leadActivity.create({
    data: {
      tenantId: tenant.id,
      leadId: lead.id,
      userId: null,
      type: "CREATED",
      title: "Lead created from website inquiry",
    },
  });

  await db.auditLog.create({
    data: {
      userId: null,
      action: "create",
      entity: "lead",
      entityId: lead.id,
      metadata: { source: "public_inquiry", email: parsed.data.email },
    },
  });

  logger.info("public inquiry created lead", { tenantId: tenant.id, leadId: lead.id });
  return { ok: true };
}
