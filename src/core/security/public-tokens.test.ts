import { describe, expect, it } from "vitest";
import { contractTokenExpiry, isContractShareToken } from "./public-tokens";

describe("public contract tokens", () => {
  it("accepts only the generated 192-bit base64url shape", () => {
    expect(isContractShareToken("a".repeat(32))).toBe(true);
    expect(isContractShareToken("short")).toBe(false);
    expect(isContractShareToken("A234567890123456789012345678901!")).toBe(false);
  });

  it("expires after 30 days by default", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(contractTokenExpiry(from).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});
