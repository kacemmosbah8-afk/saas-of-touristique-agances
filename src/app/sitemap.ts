import type { MetadataRoute } from "next";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";

const legalLastModified = new Date(LEGAL_EFFECTIVE_DATE);

/**
 * Every publicly reachable, indexable page — kept as an explicit list
 * (mirroring `TENANT_SCOPED_MODELS`'s explicit-allowlist convention in
 * `shared/lib/db.ts`) rather than crawled from the filesystem, so adding a
 * new marketing page is a deliberate, reviewable addition here too.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // "/" 307-redirects to the licensed agency's own storefront (see
  // `(marketing)/page.tsx`) — not indexed here directly, since the
  // storefront's own pages (destinations/packages/hotels/flights) are
  // where a search engine should actually land a visitor.
  const legalPages: MetadataRoute.Sitemap = [
    "/terms",
    "/privacy",
    "/refund-policy",
    "/cookie-policy",
  ].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: legalLastModified,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return legalPages;
}
