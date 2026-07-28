import { redirect } from "next/navigation";

/**
 * This deployment is licensed to a single agency, not open self-serve
 * signup — there's no public path to spin up a new tenant. `SignUpForm`
 * still exists and is used inline by the invite-acceptance flow
 * (`/invite/[token]`), which is gated behind an admin-issued token for
 * this agency's own tenant. The standalone route just sends visitors to
 * sign in instead.
 */
export default function SignUpPage() {
  redirect("/sign-in");
}
