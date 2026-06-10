import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

describe("normalization", () => {
  it("normalizes email for global dedupe", () => {
    expect(normalizeEmail("  JOHN@Example.COM ")).toBe("john@example.com");
  });

  it("normalizes formatted phone numbers", () => {
    expect(normalizePhone("(212) 555-1234")).toBe("+2125551234");
    expect(normalizePhone("+1 (212) 555-1234")).toBe("+12125551234");
    expect(normalizePhone("0300-1234567")).toBe("+923001234567");
  });
});
