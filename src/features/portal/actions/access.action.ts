"use server";

import { prisma, getTenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { writePortalAudit } from "@/shared/lib/audit";
import { env } from "@/shared/config/env";
import { getClientIp, checkPortalAccessRateLimit, checkPortalAccessIpRateLimit } from "@/shared/lib/rate-limit";
import { sendCommunication } from "@/shared/lib/communications";
import { portalMagicLinkEmail } from "@/shared/lib/email/templates/portal-magic-link";
import { generateMagicLinkToken, magicLinkExpiryDate } from "@/features/portal/lib/magic-link-token";
import {
  requestPortalAccessSchema,
  type RequestPortalAccessInput,
} from "@/features/portal/schemas/access.schema";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * The one message shown for every outcome — booking not found, email
 * doesn't match, tenant doesn't exist, rate-limited — except the two forms
 * of "you're going too fast" (which are safe to reveal: they don't confirm
 * or deny that any particular booking/email exists, only that this IP or
 * this exact email has asked too many times). Returning identical copy for
 * "it worked" and "it didn't match" is deliberate, not an oversight — see
 * Phase 7, "no enumeration attacks" in PROJECT.md, "Customer Portal
 * Capability".
 */
const GENERIC_RESPONSE =
  "If those details match a booking with us, we've sent a secure sign-in link to that email address. It expires in 15 minutes.";

export async function requestPortalAccessAction(
  tenantSlug: string,
  input: RequestPortalAccessInput,
): Promise<ActionResult<{ message: string }>> {
  const parsed = requestPortalAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a booking reference and email address." };

  const ip = await getClientIp();
  const ipLimit = await checkPortalAccessIpRateLimit(ip);
  if (!ipLimit.allowed) {
    return {
      ok: false,
      error: `Too many requests from this device. Try again after ${ipLimit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, name: true } });
  if (!tenant) return { ok: true, data: { message: GENERIC_RESPONSE } };

  const emailLimit = await checkPortalAccessRateLimit(tenant.id, parsed.data.email);
  if (!emailLimit.allowed) {
    return {
      ok: false,
      error: `Too many requests for this email. Try again after ${emailLimit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const db = getTenantDb(tenant.id);
  const bookingReference = parsed.data.bookingReference.toUpperCase();

  const booking = await db.booking.findFirst({
    where: {
      reference: bookingReference,
      deletedAt: null,
      customer: { email: { equals: parsed.data.email, mode: "insensitive" }, deletedAt: null },
    },
    select: { id: true, customerId: true, customer: { select: { firstName: true } } },
  });

  if (!booking) {
    logger.info("portal access request: no match", { tenantId: tenant.id, bookingReference });
    return { ok: true, data: { message: GENERIC_RESPONSE } };
  }

  const token = generateMagicLinkToken();
  const expiresAt = magicLinkExpiryDate();

  const magicLink = await db.portalMagicLink.create({
    data: {
      tenantId: tenant.id,
      customerId: booking.customerId,
      token,
      expiresAt,
      requestedBookingReference: bookingReference,
      requestIp: ip,
    },
    select: { id: true },
  });

  await writePortalAudit(db, {
    customerId: booking.customerId,
    action: "portal_access_requested",
    entityId: magicLink.id,
    metadata: { bookingReference, ip },
  });

  const baseUrl = env.AUTH_URL ?? "http://localhost:3000";
  const accessUrl = `${baseUrl}/portal/${tenantSlug}/verify?token=${token}`;

  const { subject, html, text } = portalMagicLinkEmail({
    tenantName: tenant.name,
    customerFirstName: booking.customer.firstName,
    bookingReference,
    accessUrl,
    expiresAt,
  });

  const result = await sendCommunication(db, {
    tenantId: tenant.id,
    owner: { type: "portal_magic_link", id: magicLink.id },
    to: parsed.data.email,
    subject,
    html,
    text,
  });
  if (!result.sent) {
    logger.warn("portal access email not sent", { tenantId: tenant.id, magicLinkId: magicLink.id, reason: result.reason });
  }

  return { ok: true, data: { message: GENERIC_RESPONSE } };
}
