import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide default OG card, generated at request time. Mirrors the warm
 * ivory/terracotta palette in globals.css — Satori doesn't support CSS
 * custom properties or oklch(), so those tokens are hardcoded here as
 * their closest static hex; keep in sync by eye if the palette changes.
 * Any page can override this by adding its own `opengraph-image.tsx` in
 * the same route segment; none do yet, so this one applies everywhere.
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
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#a8532c",
            color: "#fdf8f1",
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          1:1
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -1, fontFamily: "serif" }}>
          One To One
        </div>
        <div style={{ fontSize: 32, color: "#8a7a6d", marginTop: 20 }}>
          Algeria&apos;s Travel &amp; Tourism Agency
        </div>
      </div>
    ),
    { ...size },
  );
}
