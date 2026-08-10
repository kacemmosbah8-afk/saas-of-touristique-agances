import { describe, it, expect } from "vitest";

import { readImageDimensions } from "@/shared/lib/image-dimensions";

function buildPng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0); // IHDR payload is always 13 bytes
  const type = Buffer.from("IHDR", "ascii");
  const payload = Buffer.alloc(13);
  payload.writeUInt32BE(width, 0);
  payload.writeUInt32BE(height, 4);
  payload[8] = 8; // bit depth
  payload[9] = 2; // color type
  const crc = Buffer.alloc(4); // not verified by our reader
  return Buffer.concat([signature, length, type, payload, crc]);
}

function buildJpeg(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  // A harmless APP0/JFIF segment before the frame header, like real JPEGs have.
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
  const sof0Header = Buffer.from([0xff, 0xc0]);
  const sof0Length = Buffer.alloc(2);
  sof0Length.writeUInt16BE(8, 0); // length field itself + precision + h + w + components-count byte (0 here)
  const precision = Buffer.from([0x08]);
  const heightBuf = Buffer.alloc(2);
  heightBuf.writeUInt16BE(height, 0);
  const widthBuf = Buffer.alloc(2);
  widthBuf.writeUInt16BE(width, 0);
  const componentsCount = Buffer.from([0x00]);
  return Buffer.concat([soi, app0, sof0Header, sof0Length, precision, heightBuf, widthBuf, componentsCount]);
}

describe("readImageDimensions", () => {
  it("reads PNG width/height from the IHDR chunk", () => {
    expect(readImageDimensions(buildPng(1712, 2284), "image/png")).toEqual({ width: 1712, height: 2284 });
  });

  it("reads JPEG width/height from the SOF0 marker", () => {
    expect(readImageDimensions(buildJpeg(1600, 1200), "image/jpeg")).toEqual({ width: 1600, height: 1200 });
  });

  it("returns null for a truncated/malformed PNG", () => {
    expect(readImageDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png")).toBeNull();
  });

  it("returns null for a truncated/malformed JPEG", () => {
    expect(readImageDimensions(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg")).toBeNull();
  });

  it("returns null for unrecognized MIME types instead of guessing", () => {
    expect(readImageDimensions(buildPng(100, 100), "image/webp")).toBeNull();
    expect(readImageDimensions(buildPng(100, 100), "application/pdf")).toBeNull();
  });

  it("never throws on garbage input", () => {
    const garbage = Buffer.from(Array.from({ length: 50 }, (_, i) => i * 7));
    expect(() => readImageDimensions(garbage, "image/png")).not.toThrow();
    expect(() => readImageDimensions(garbage, "image/jpeg")).not.toThrow();
    expect(readImageDimensions(garbage, "image/png")).toBeNull();
  });

  it("does not hang on a long run of 0xFF fill bytes in a JPEG", () => {
    const fillBytes = Buffer.alloc(2000, 0xff);
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8]), fillBytes]);
    expect(readImageDimensions(buffer, "image/jpeg")).toBeNull();
  });
});
