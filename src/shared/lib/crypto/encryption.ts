import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { env } from "@/shared/config/env";

/**
 * Symmetric encryption for sensitive secrets at rest (provider credentials).
 *
 * Uses AES-256-GCM: authenticated encryption, so tampering with the ciphertext
 * is detected on decrypt. Each value gets a fresh random IV. The three parts
 * (ciphertext, iv, authTag) are stored in separate columns.
 */

const ALGORITHM = "aes-256-gcm";

/** Resolve a 32-byte key from ENCRYPTION_KEY, or derive one from AUTH_SECRET. */
function resolveKey(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  if (raw) {
    // Accept hex or base64; both must decode to exactly 32 bytes.
    const asHex = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : null;
    if (asHex && asHex.length === 32) return asHex;
    const asB64 = Buffer.from(raw, "base64");
    if (asB64.length === 32) return asB64;
    throw new Error("ENCRYPTION_KEY must be a 32-byte value encoded as hex or base64.");
  }
  // Deterministic fallback: derive from AUTH_SECRET with a fixed salt.
  return scryptSync(env.AUTH_SECRET, "travelos-provider-credentials", 32);
}

const KEY = resolveKey();

export type EncryptedPayload = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedValue, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Mask a secret for display, revealing only the last 4 characters. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return `${"•".repeat(Math.min(plaintext.length - 4, 12))}${plaintext.slice(-4)}`;
}
