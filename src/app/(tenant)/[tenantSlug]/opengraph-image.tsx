import { ImageResponse } from "next/og";

import { getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_NAME = "One One Tourism";
const BRAND_COLOR = "#0033b0";

/**
 * Tenant-scoped OG card — takes priority over the root `opengraph-image.tsx`
 * for every route under `[tenantSlug]`. Name and brand color are fixed (this
 * is a single-customer build, not admin-editable); the tagline is the one
 * still-editable piece (Settings → Public Website), so it's the only field
 * still read from the database.
 */
export default async function Image({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  const profile = tenant ? await getAgencyProfile(tenant.id) : null;
  const tagline = profile?.tagline || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#f7f9fc",
          color: "#1a2440",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 44,
            background: BRAND_COLOR,
            color: "#fdf8f1",
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "serif",
            marginBottom: 36,
          }}
        >
          1
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -1, fontFamily: "serif" }}>
          {BRAND_NAME}
        </div>
        {tagline && (
          <div style={{ fontSize: 30, color: "#c9a24a", marginTop: 20, maxWidth: 900 }}>
            {tagline}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
