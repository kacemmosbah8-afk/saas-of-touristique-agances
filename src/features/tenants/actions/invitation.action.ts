"use server";

import { Prisma } from "@prisma/client";

import { requirePermission, requireSession } from "@/shared/lib/permissions/guard";
import { prisma } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { env } from "@/shared/config/env";
import { checkInvitationRateLimit } from "@/shared/lib/rate-limit";
import { sendCommunication } from "@/shared/lib/communications";
import { describeSendFailure } from "@/shared/lib/communications/describe-failure";
import { invitationEmail } from "@/shared/lib/email/templates/invitation";
import {
  generateInvitationToken,
  invitationExpiryDate,
  isInvitationExpired,
} from "@/features/tenants/lib/invitation-token";
import {
  createInvitationSchema,
  MEMBERSHIP_ROLE_LABELS,
  type CreateInvitationInput,
} from "@/features/tenants/schemas/invitation.schema";
import type { ActionResult } from "@/shared/types/action-result";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

type InvitationRecord = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
};

/**
 * Sends (or resends) the invitation email through the Communication
 * Capability. Shared by create and resend so both write exactly one
 * `CommunicationMessage` row the same way — no per-action duplication of
 * the send-and-record sequence.
 */
async function sendInvitationEmail(
  db: TenantDbFrom,
  tenantId: string,
  invitation: InvitationRecord,
  inviterName: string,
  sentByUserId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const baseUrl = env.AUTH_URL ?? "http://localhost:3000";
  const acceptUrl = `${baseUrl}/invite/${invitation.token}`;

  const { subject, html, text } = invitationEmail({
    tenantName: tenant?.name ?? "your travel agency",
    inviterName,
    role:
      MEMBERSHIP_ROLE_LABELS[invitation.role as keyof typeof MEMBERSHIP_ROLE_LABELS] ??
      invitation.role,
    acceptUrl,
    expiresAt: invitation.expiresAt,
  });

  const result = await sendCommunication(db, {
    tenantId,
    owner: { type: "invitation", id: invitation.id },
    to: invitation.email,
    subject,
    html,
    text,
    sentByUserId,
  });

  if (!result.sent) {
    logger.warn("invitation email not sent", {
      tenantId,
      invitationId: invitation.id,
      reason: result.reason,
    });
    return { sent: false, reason: result.reason };
  }
  logger.info("invitation email sent", { tenantId, invitationId: invitation.id });
  return { sent: true };
}

export async function createInvitationAction(
  tenantId: string,
  input: CreateInvitationInput,
): Promise<ActionResult<{ invitationId: string; emailSent: boolean }>> {
  const { session, db } = await requirePermission(tenantId, "invitation", "create");

  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = await checkInvitationRateLimit(tenantId);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Too many invitations sent. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const existingMember = await db.membership.findFirst({
    where: { tenantId, status: "ACTIVE", user: { email: parsed.data.email } },
    select: { id: true },
  });
  if (existingMember) {
    return { ok: false, error: "This person is already a member of this workspace." };
  }

  const token = generateInvitationToken();
  const expiresAt = invitationExpiryDate();

  let invitation: InvitationRecord;
  try {
    invitation = await db.invitation.upsert({
      where: { tenantId_email: { tenantId, email: parsed.data.email } },
      create: { tenantId, email: parsed.data.email, role: parsed.data.role, token, expiresAt },
      // Re-inviting (still pending, or previously accepted then removed) reissues
      // a fresh token/expiry and clears any prior acceptance.
      update: { role: parsed.data.role, token, expiresAt, acceptedAt: null },
      select: { id: true, email: true, role: true, token: true, expiresAt: true },
    });
  } catch (err) {
    logger.error("invitation create failed", { tenantId, error: String(err) });
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "invite",
    entity: "invitation",
    entityId: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  });
  logger.info("invitation created", { tenantId, invitationId: invitation.id });

  const emailResult = await sendInvitationEmail(
    db,
    tenantId,
    invitation,
    session.user.name ?? session.user.email ?? "A teammate",
    session.user.id,
  );

  return { ok: true, data: { invitationId: invitation.id, emailSent: emailResult.sent } };
}

/**
 * Regenerates the token/expiry and resends. Unlike creation, this action's
 * entire purpose is the email — so, unlike `createInvitationAction`, a
 * failed send is reported as a failed action (mirrors
 * `resendInvoiceEmailAction`'s identical shape).
 */
export async function resendInvitationAction(
  tenantId: string,
  invitationId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invitation", "update");

  const limit = await checkInvitationRateLimit(tenantId);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Too many invitations sent. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const existing = await db.invitation.findFirst({
    where: { id: invitationId, tenantId },
    select: { acceptedAt: true },
  });
  if (!existing) return { ok: false, error: "Invitation not found." };
  if (existing.acceptedAt) {
    return { ok: false, error: "This invitation has already been accepted." };
  }

  const token = generateInvitationToken();
  const expiresAt = invitationExpiryDate();
  const invitation = await db.invitation.update({
    where: { id: invitationId, tenantId },
    data: { token, expiresAt },
    select: { id: true, email: true, role: true, token: true, expiresAt: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "invite_resend",
    entity: "invitation",
    entityId: invitationId,
    metadata: { email: invitation.email },
  });

  const emailResult = await sendInvitationEmail(
    db,
    tenantId,
    invitation,
    session.user.name ?? session.user.email ?? "A teammate",
    session.user.id,
  );
  if (!emailResult.sent) {
    return { ok: false, error: describeSendFailure(emailResult.reason) };
  }
  return { ok: true };
}

export async function revokeInvitationAction(
  tenantId: string,
  invitationId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invitation", "delete");

  const existing = await db.invitation.findFirst({
    where: { id: invitationId, tenantId },
    select: { email: true, role: true, acceptedAt: true },
  });
  if (!existing) return { ok: false, error: "Invitation not found." };
  if (existing.acceptedAt) {
    return { ok: false, error: "This invitation has already been accepted and can't be revoked." };
  }

  await db.invitation.delete({ where: { id: invitationId, tenantId } });

  await writeAudit(db, {
    userId: session.user.id,
    action: "invite_revoke",
    entity: "invitation",
    entityId: invitationId,
    metadata: { email: existing.email, role: existing.role },
  });
  logger.info("invitation revoked", { tenantId, invitationId });

  return { ok: true };
}

/**
 * Accepts an invitation by token. Deliberately NOT `requirePermission` —
 * the invited person has no membership yet, which is exactly the state
 * this action resolves. The token itself is the authorization boundary
 * here (same trust model as Auth.js's own VerificationToken), so this reads
 * the Invitation directly via the raw client rather than a tenant-scoped
 * one — there is no tenant to scope by until the token is validated.
 */
export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult<{ tenantSlug: string }>> {
  const session = await requireSession();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      tenantId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      tenant: { select: { slug: true } },
    },
  });
  if (!invitation) return { ok: false, error: "This invitation link is invalid." };
  if (invitation.acceptedAt) {
    return { ok: false, error: "This invitation has already been accepted." };
  }
  if (isInvitationExpired(invitation.expiresAt)) {
    return { ok: false, error: "This invitation has expired. Ask for a new one." };
  }
  if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    return {
      ok: false,
      error: `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.membership.upsert({
        where: { tenantId_userId: { tenantId: invitation.tenantId, userId: session.user.id } },
        create: {
          tenantId: invitation.tenantId,
          userId: session.user.id,
          role: invitation.role,
          status: "ACTIVE",
        },
        // Re-accepting after being previously removed reactivates membership
        // at the (possibly updated) invited role.
        update: { role: invitation.role, status: "ACTIVE" },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          userId: session.user.id,
          action: "invite_accept",
          entity: "invitation",
          entityId: invitation.id,
          metadata: { email: invitation.email, role: invitation.role },
        },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error("invitation accept failed", { invitationId: invitation.id, error: String(err) });
      return { ok: false, error: "Could not accept this invitation. Try again." };
    }
    throw err;
  }

  logger.info("invitation accepted", {
    tenantId: invitation.tenantId,
    userId: session.user.id,
    invitationId: invitation.id,
  });
  return { ok: true, data: { tenantSlug: invitation.tenant.slug } };
}
