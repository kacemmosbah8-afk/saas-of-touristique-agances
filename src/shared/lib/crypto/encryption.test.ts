import { describe, it, expect } from "vitest";

import { encryptSecret, decryptSecret, maskSecret } from "@/shared/lib/crypto/encryption";

describe("credential encryption (AES-256-GCM)", () => {
  it("round-trips a secret", () => {
    const payload = encryptSecret("super-secret-api-key-12345");
    expect(payload.encryptedValue).not.toContain("super-secret");
    expect(decryptSecret(payload)).toBe("super-secret-api-key-12345");
  });

  it("uses a fresh IV per encryption", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a.iv).not.toBe(b.iv);
    expect(a.encryptedValue).not.toBe(b.encryptedValue);
  });

  it("detects tampering via the auth tag", () => {
    const payload = encryptSecret("tamper-me");
    const corrupted = {
      ...payload,
      encryptedValue: Buffer.from("corrupted-data").toString("base64"),
    };
    expect(() => decryptSecret(corrupted)).toThrow();
  });

  it("handles unicode and long values", () => {
    const value = "clé-secrète-🔐-".repeat(200);
    expect(decryptSecret(encryptSecret(value))).toBe(value);
  });
});

describe("maskSecret", () => {
  it("reveals only the last 4 characters", () => {
    expect(maskSecret("abcdefghij")).toMatch(/^•+ghij$/);
    expect(maskSecret("ab")).toBe("••••");
  });
});
