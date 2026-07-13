/**
 * Pure constants, deliberately kept out of `site-config.ts` (which is
 * `server-only`) so the mobile nav toggle — a client component — can
 * import the link list directly without pulling `env` into the browser
 * bundle.
 */

export const MAIN_NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
] as const;
