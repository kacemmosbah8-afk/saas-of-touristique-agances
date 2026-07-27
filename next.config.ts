import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's own dev-mode route/Turbopack indicator badge — dev-server-only
  // regardless, but suppressed outright so it never floats over the site
  // while testing locally.
  devIndicators: false,
  images: {
    remotePatterns: [
      // UploadThing's CDN — traveller/supplier document uploads only now
      // (see PROJECT.md §47). `utfs.io` is the URL `uploadthing-provider.ts`'s
      // `getUrl()` constructs by hand; `*.ufs.sh` is what the SDK's own
      // `file.ufsUrl` returns on upload completion — both need to be
      // allowed since the codebase produces URLs both ways.
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // Supabase Storage — every package/hotel/flight/activity/destination
      // cover and gallery image (§47). The agency's own logo is a fixed
      // local asset (`public/brand/logo.png`), not remote-hosted. Wildcarded
      // by project ref so this isn't hardcoded to one Supabase project.
      { protocol: "https", hostname: "*.supabase.co" },
      // Unsplash — real, freely-licensed stock photography used to seed
      // the initial destinations/hotels/activities/packages catalog
      // (prisma/seed-catalog.ts) before real property photos are supplied.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
    // AVIF first (smallest), falling back to WebP — Next serves whichever
    // the requesting browser's Accept header supports, transparently.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
