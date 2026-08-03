"use server";

import { revalidatePath } from "next/cache";

import { prisma, getTenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getDictionary } from "@/shared/i18n/dictionary";
import { planTripSchema, type PlanTripInput } from "@/features/leads/schemas/plan-trip.schema";
import type { ActionResult } from "@/shared/types/action-result";

const TRAVEL_STYLE_LABELS: Record<string, string> = {
  LUXURY: "Luxury",
  FAMILY: "Family",
  ADVENTURE: "Adventure",
  HONEYMOON: "Honeymoon",
  BUDGET: "Budget-friendly",
  CULTURAL: "Cultural",
};

/**
 * "Plan My Trip" quiz → Lead pipeline. Reachable by anonymous visitors
 * (no `requirePermission`, same non-staff-actor convention as
 * `createPublicInquiryAction`/`createBookingRequestAction`). Distinct from
 * both of those: this is for a visitor with no specific product in mind
 * yet, so budget maps to `estimatedValue`/`currency` and the other four
 * answers get their own `trip*` columns (source `PLAN_MY_TRIP`, not plain
 * `WEBSITE`) so the admin Leads list/detail can show and filter on them
 * directly, instead of only a `notes` recap.
 */
export async function createPlanTripAction(
  tenantSlug: string,
  input: PlanTripInput,
): Promise<ActionResult> {
  const dict = getDictionary(await getVisitorLocale());

  const parsed = planTripSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: dict.contact.genericError };
  }

  // Honeypot — report success without writing anything so bots get no signal.
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

  const styleLabel = TRAVEL_STYLE_LABELS[parsed.data.travelStyle] ?? parsed.data.travelStyle;
  const notes = [
    `Destination: ${parsed.data.destination}`,
    `Travel period: ${parsed.data.travelPeriod}`,
    `Travelers: ${parsed.data.travelers}`,
    `Style: ${styleLabel}`,
  ].join("\n");

  const lead = await db.lead.create({
    data: {
      tenantId: tenant.id,
      title: `Trip planning request — ${parsed.data.destination}`,
      contactName: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      source: "PLAN_MY_TRIP",
      estimatedValue: parsed.data.budget,
      currency: parsed.data.currency,
      tripDestination: parsed.data.destination,
      tripTravelers: parsed.data.travelers,
      tripPeriod: parsed.data.travelPeriod,
      tripStyle: styleLabel,
      notes,
    },
    select: { id: true },
  });

  await db.leadActivity.create({
    data: {
      tenantId: tenant.id,
      leadId: lead.id,
      userId: null,
      type: "CREATED",
      title: "Lead created from Plan My Trip",
    },
  });

  await db.auditLog.create({
    data: {
      userId: null,
      action: "create",
      entity: "lead",
      entityId: lead.id,
      metadata: { source: "plan_my_trip", email: parsed.data.email },
    },
  });

  logger.info("plan-my-trip created lead", { tenantId: tenant.id, leadId: lead.id });
  // See the equivalent comment in createBookingRequestAction — invalidate
  // just the admin Leads list instead of disabling client caching globally.
  revalidatePath(`/${tenantSlug}/admin/leads`);
  return { ok: true };
}
