import type { MetadataRoute } from "next";

import { siteConfig } from "@/features/marketing/lib/site-config";

/**
 * Disallow rules here are defense in depth, not the primary control — the
 * authenticated routes below also carry `robots: { index: false }` in
 * their own metadata (see `(dashboard)/[tenantSlug]/layout.tsx`,
 * `onboarding/page.tsx`, `invite/[token]/page.tsx`). A crawler that
 * ignores robots.txt still can't get past auth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/onboarding", "/invite/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
