"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/shared/lib/db";
import { signIn } from "@/shared/lib/auth";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas/sign-up.schema";
import type { ActionResult } from "@/features/auth/actions/sign-in.action";

const PASSWORD_HASH_ROUNDS = 12;

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, PASSWORD_HASH_ROUNDS);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });

  return { success: true };
}
