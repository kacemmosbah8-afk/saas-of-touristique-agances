import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generated, not a static asset — there is no designed brand mark yet (see
 * PROJECT.md, "Public Website & Verification Readiness"). This replaces
 * the stock `create-next-app` favicon with something intentional; swap for
 * a real logo file whenever one exists, no other code changes needed.
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
          background: "#0a0a0a",
          borderRadius: 6,
          color: "#fafafa",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
