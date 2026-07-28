import type { MembershipRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

export interface TenantMembershipClaim {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: MembershipRole;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    memberships: TenantMembershipClaim[];
    activeTenantId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    memberships?: TenantMembershipClaim[];
    activeTenantId?: string;
  }
}

// next-auth/jwt.d.ts re-exports JWT from @auth/core/jwt via `export *`;
// augmenting only "next-auth/jwt" doesn't reliably merge into the type
// NextAuth's own callback signatures resolve internally, so the same
// augmentation is repeated against the source module.
declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    memberships?: TenantMembershipClaim[];
    activeTenantId?: string;
  }
}
