import { ImageResponse } from "next/og";

import { getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const FALLBACK_COLOR = "#a8532c";

/**
 * Tenant-scoped favicon — takes priority over the root `icon.tsx` (which
 * renders TravelOS's own "T" mark) for every route under `[tenantSlug]`.
 * This is a white-label product: a visitor to the agency's site must never
 * see TravelOS's browser-tab icon. Uses the agency's uploaded logo if set,
 * otherwise the agency's own initial on their brand color — never a
 * TravelOS-owned placeholder.
 */
export default async function Icon({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  const profile = tenant ? await getAgencyProfile(tenant.id) : null;
  const color = profile?.primaryColor || FALLBACK_COLOR;
  const initial = (tenant?.name?.trim()?.[0] || "?").toUpperCase();

  if (profile?.logoUrl) {
    try {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              borderRadius: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.logoUrl}
              alt=""
              width={28}
              height={28}
              style={{ objectFit: "contain" }}
            />
          </div>
        ),
        { ...size },
      );
    } catch {
      // Logo failed to fetch/render (unreachable host, unsupported format)
      // — fall through to the initial-letter mark below rather than 500.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color,
          borderRadius: 8,
          color: "#fdf8f1",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "serif",
        }}
      >
        {initial}
      </div>
    ),
    { ...size },
  );
}
