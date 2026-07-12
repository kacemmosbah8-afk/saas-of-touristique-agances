"use server";

import { signOut } from "@/shared/lib/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
