/**
 * Pure constants, deliberately kept out of `site-config.ts` (which is
 * `server-only`) so the mobile nav toggle — a client component — can
 * import the link list directly without pulling `env` into the browser
 * bundle.
 */

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
] as const;
