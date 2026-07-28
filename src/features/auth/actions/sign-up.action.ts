"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/shared/lib/db";
import { signIn } from "@/shared/lib/auth";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas/sign-up.schema";
import { checkSignUpRateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

const PASSWORD_HASH_ROUNDS = 12;

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const limit = await checkSignUpRateLimit();
  if (!limit.allowed) {
    logger.warn("sign-up rate limit exceeded");
    return {
      ok: false,
      error: `Too many accounts created from your network. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, PASSWORD_HASH_ROUNDS);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "An account with this email already exists." };
    }
    logger.error("sign-up user create failed", { error: String(err) });
    throw err;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });

  logger.info("sign-up success", { email: parsed.data.email });
  return { ok: true };
}
