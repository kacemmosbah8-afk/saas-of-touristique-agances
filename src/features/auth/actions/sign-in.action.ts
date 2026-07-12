"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/shared/lib/auth";
import { signInSchema, type SignInInput } from "@/features/auth/schemas/sign-in.schema";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid email or password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    throw err;
  }

  return { success: true };
}
