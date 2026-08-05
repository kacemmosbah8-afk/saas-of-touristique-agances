import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/shared/lib/auth.config";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/lib/db";
import type { TenantMembershipClaim } from "@/types/next-auth";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

async function loadMembershipClaims(
  userId: string,
): Promise<TenantMembershipClaim[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { slug: true, name: true } },
    },
  });

  return memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantSlug: m.tenant.slug,
    tenantName: m.tenant.name,
    role: m.role,
  }));
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  providers: [
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // `memberships`/`activeTenantId` cached on the token below are for
    // DISPLAY purposes only (workspace switcher, dashboard header, the
    // onboarding redirect) — refreshed on sign-in and on an explicit
    // client-side `update()` call, never otherwise. Do NOT use them as an
    // authorization source; requireTenantMembership() in
    // shared/lib/permissions/guard.ts hits the database instead precisely
    // because this cache goes stale the instant a membership changes.
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.userId = user.id;
      }

      if (user?.id || trigger === "update") {
        token.memberships = await loadMembershipClaims(
          (token.userId as string) ?? user!.id!,
        );
      }

      if (trigger === "update" && session?.activeTenantId) {
        token.activeTenantId = session.activeTenantId;
      } else if (!token.activeTenantId && token.memberships?.length) {
        token.activeTenantId = token.memberships[0].tenantId;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.memberships = token.memberships ?? [];
      session.activeTenantId = token.activeTenantId;
      return session;
    },
  },
});
