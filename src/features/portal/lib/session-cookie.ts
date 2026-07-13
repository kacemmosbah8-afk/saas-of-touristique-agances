import "server-only";
import { cookies } from "next/headers";

import { env } from "@/shared/config/env";

/**
 * The portal session cookie. Scoped to `/portal` only (never sent to staff
 * `/api`/dashboard routes) and named distinctly from Auth.js's own
 * `authjs.session-token` so the two credential systems can never be
 * confused for one another, in either direction.
 */
export const PORTAL_SESSION_COOKIE = "travelos_portal_session";

export async function setPortalSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    expires: expiresAt,
  });
}

export async function getPortalSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(PORTAL_SESSION_COOKIE)?.value ?? null;
}

export async function clearPortalSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete({ name: PORTAL_SESSION_COOKIE, path: "/portal" });
}
