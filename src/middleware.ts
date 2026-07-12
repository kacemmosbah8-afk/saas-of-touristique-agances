import NextAuth from "next-auth";

import { authConfig } from "@/shared/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Skip static assets, Next internals, and every /api route (API routes
  // enforce their own auth — see src/shared/lib/permissions/guard.ts).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
