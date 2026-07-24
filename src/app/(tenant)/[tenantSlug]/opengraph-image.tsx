import { ImageResponse } from "next/og";

import { getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FALLBACK_COLOR = "#a8532c";

/**
 * Tenant-scoped OG card — takes priority over the root `opengraph-image.tsx`
 * (which literally reads "TravelOS — The Operating System for Travel
 * Agencies") for every route under `[tenantSlug]`. Whoever shares this
 * agency's link on WhatsApp/Facebook/iMessage must see the agency's own
 * name and tagline in the preview, never TravelOS's.
 */
export default async function Image({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  const profile = tenant ? await getAgencyProfile(tenant.id) : null;
  const color = profile?.primaryColor || FALLBACK_COLOR;
  const name = tenant?.name ?? "";
  const initial = (name.trim()[0] || "?").toUpperCase();
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
          background: "#faf6ef",
          color: "#3a2a1f",
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
            borderRadius: 20,
            background: color,
            color: "#fdf8f1",
            fontSize: 40,
            fontWeight: 700,
            fontFamily: "serif",
            marginBottom: 36,
          }}
        >
          {initial}
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -1, fontFamily: "serif" }}>
          {name}
        </div>
        {tagline && (
          <div style={{ fontSize: 30, color: "#8a7a6d", marginTop: 20, maxWidth: 900 }}>
            {tagline}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
