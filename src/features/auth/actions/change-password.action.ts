"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/shared/lib/db";
import { requireSession } from "@/shared/lib/permissions/guard";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/auth/schemas/change-password.schema";
import { checkChangePasswordRateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

const PASSWORD_HASH_ROUNDS = 12;

/** Self-service password change for the signed-in user's own account. */
export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = await checkChangePasswordRateLimit(session.user.id);
  if (!limit.allowed) {
    logger.warn("change-password rate limit exceeded", { userId: session.user.id });
    return {
      ok: false,
      error: `Too many attempts. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return { ok: false, error: "This account has no password set." };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    logger.info("change-password failed: bad current password", { userId: session.user.id });
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, PASSWORD_HASH_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  logger.info("change-password success", { userId: session.user.id });
  return { ok: true };
}
