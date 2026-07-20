import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // UploadThing's CDN — every uploaded package/hotel/destination/activity
    // image and the agency's own logo are served from here. `utfs.io` is
    // the URL `uploadthing-provider.ts`'s `getUrl()` constructs by hand;
    // `*.ufs.sh` is what the SDK's own `file.ufsUrl` returns on upload
    // completion (see file-router.ts) — both need to be allowed since the
    // codebase produces URLs both ways.
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
  },
};

export default nextConfig;
