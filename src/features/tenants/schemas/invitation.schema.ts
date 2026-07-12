import { z } from "zod";

/**
 * OWNER is deliberately not invitable. Granting OWNER only ever happens by
 * transferring it explicitly (not built this sprint — out of scope, see
 * PROJECT.md) — an invite form is the wrong surface for handing out the
 * platform's highest privilege, since anyone with `invitation:create`
 * (OWNER *and* ADMIN) could otherwise mint a new OWNER through it.
 */
export const INVITABLE_ROLES = ["ADMIN", "AGENT", "ACCOUNTANT", "READ_ONLY"] as const;

export const MEMBERSHIP_ROLE_LABELS: Record<(typeof INVITABLE_ROLES)[number] | "OWNER", string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Agent",
  ACCOUNTANT: "Accountant",
  READ_ONLY: "Read-only",
};

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(INVITABLE_ROLES),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1, "Missing invitation token"),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
