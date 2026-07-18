import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generated, not a static asset — mirrors the terracotta `<Logo />` mark
 * (`shared/components/brand/logo.tsx`) at favicon scale. Satori (the
 * renderer behind `ImageResponse`) doesn't support CSS custom properties
 * or oklch(), so the brand terracotta is hardcoded here as its closest
 * static hex — keep this in sync with `--primary` in globals.css by eye
 * if that token ever changes.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a8532c",
          borderRadius: 8,
          color: "#fdf8f1",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "serif",
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
