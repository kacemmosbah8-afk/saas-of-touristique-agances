import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide default OG card, generated at request time — no designed
 * marketing asset exists yet (see PROJECT.md, "Public Website &
 * Verification Readiness"). Any page can override this by adding its own
 * `opengraph-image.tsx` in the same route segment; none do yet, so this
 * one applies everywhere.
 */
export default function OpengraphImage() {
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
          background: "#0a0a0a",
          color: "#fafafa",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -1 }}>TravelOS</div>
        <div style={{ fontSize: 32, color: "#a1a1aa", marginTop: 20 }}>
          The Operating System for Travel Agencies
        </div>
      </div>
    ),
    { ...size },
  );
}
