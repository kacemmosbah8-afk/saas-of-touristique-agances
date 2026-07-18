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
  const marketingPagePaths: Array<{
    path: string;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
    priority: number;
  }> = [
    { path: "", changeFrequency: "monthly", priority: 1 },
    { path: "/features", changeFrequency: "monthly", priority: 0.9 },
    { path: "/solutions", changeFrequency: "monthly", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  ];
  const marketingPages: MetadataRoute.Sitemap = marketingPagePaths.map((page) => ({
    url: `${siteConfig.url}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

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

  return [...marketingPages, ...legalPages];
}
