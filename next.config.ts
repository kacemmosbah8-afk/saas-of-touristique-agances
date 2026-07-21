import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing's CDN — traveller/supplier document uploads only now
      // (see PROJECT.md §47). `utfs.io` is the URL `uploadthing-provider.ts`'s
      // `getUrl()` constructs by hand; `*.ufs.sh` is what the SDK's own
      // `file.ufsUrl` returns on upload completion — both need to be
      // allowed since the codebase produces URLs both ways.
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // Supabase Storage — every cover image, gallery image, and the
      // agency logo (§47). Wildcarded by project ref so this isn't
      // hardcoded to one Supabase project.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
