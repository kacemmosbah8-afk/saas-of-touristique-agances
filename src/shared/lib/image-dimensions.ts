/**
 * Minimal, dependency-free width/height readers for PNG and JPEG — used to
 * independently re-verify a document's resolution server-side (the client's
 * quality check in `image-quality.ts` is UX, not authoritative).
 *
 * Deliberately hand-rolled instead of pulling in an image-metadata library:
 * the popular `image-size` package has unpatched DoS advisories in its
 * ICNS/JXL/HEIF parsers (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq) — exactly
 * the wrong risk to add on an anonymous upload endpoint. These two parsers
 * only read a handful of well-understood, fixed-size header bytes each
 * (PNG's IHDR chunk; JPEG's SOF markers) — no loops driven by attacker-
 * controlled counts — so there's no equivalent hang risk. WEBP/GIF return
 * `null` (not decoded) rather than adding more parsers for formats visa
 * documents rarely arrive in.
 */

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  // IHDR is always the first chunk, immediately after the signature: 4-byte
  // length, 4-byte type "IHDR", then 4-byte width + 4-byte height (big-endian).
  if (!buffer.subarray(12, 16).toString("ascii").includes("IHDR")) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  // Walk the marker segments looking for a Start-Of-Frame marker (SOF0-SOF15,
  // excluding the DHT/JPG/DAC markers in that numeric range) — bounded by
  // buffer length, so a truncated/malformed file just falls through to null
  // rather than looping.
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // Fill bytes and standalone markers (TEM, RST0-RST7, EOI) carry no
    // length field — reading one here would desync the walk.
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

/** Returns pixel dimensions for PNG/JPEG buffers, or null for any other
 * format (including truncated/malformed input) — never throws. */
export function readImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    if (mimeType === "image/png") return readPngDimensions(buffer);
    if (mimeType === "image/jpeg") return readJpegDimensions(buffer);
    return null;
  } catch {
    return null;
  }
}
