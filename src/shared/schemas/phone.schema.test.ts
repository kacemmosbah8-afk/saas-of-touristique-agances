import { describe, it, expect } from "vitest";

import { normalizePhoneNumber, phoneFormatSchema } from "@/shared/schemas/phone.schema";

describe("normalizePhoneNumber", () => {
  it("normalizes a number with its own + country code regardless of the default country hint", () => {
    expect(normalizePhoneNumber("+213555000111", "FR")).toBe("+213555000111");
  });

  it("uses the default country hint when the input has no country code", () => {
    expect(normalizePhoneNumber("0555000111", "DZ")).toBe("+213555000111");
  });

  it("returns null for a string that isn't a plausible phone number at all", () => {
    expect(normalizePhoneNumber("not a phone number", "DZ")).toBeNull();
    expect(normalizePhoneNumber("123", "DZ")).toBeNull();
  });

  it("returns null with no default country and no country code in the input", () => {
    expect(normalizePhoneNumber("0555000111")).toBeNull();
  });
});

describe("phoneFormatSchema", () => {
  const schema = phoneFormatSchema({ message: "Invalid phone", defaultCountry: "DZ" });

  it("accepts a valid number", () => {
    expect(schema.safeParse("+213555000111").success).toBe(true);
  });

  it("rejects an invalid number with the given message", () => {
    const result = schema.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Invalid phone");
  });
});
