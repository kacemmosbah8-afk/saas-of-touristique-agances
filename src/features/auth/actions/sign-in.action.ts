"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/shared/lib/auth";
import { signInSchema, type SignInInput } from "@/features/auth/schemas/sign-in.schema";
import { checkSignInRateLimit } from "@/shared/lib/rate-limit";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export type { ActionResult };

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or password." };
  }

  const limit = await checkSignInRateLimit(parsed.data.email);
  if (!limit.allowed) {
    logger.warn("sign-in rate limit exceeded", { email: parsed.data.email });
    return {
      ok: false,
      error: `Too many sign-in attempts. Try again after ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      logger.info("sign-in failed: bad credentials", { email: parsed.data.email });
      return { ok: false, error: "Invalid email or password." };
    }
    logger.error("sign-in unexpected error", { error: String(err) });
    throw err;
  }

  logger.info("sign-in success", { email: parsed.data.email });
  return { ok: true };
}
