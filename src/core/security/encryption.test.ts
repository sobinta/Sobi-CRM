import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import { encryptField, decryptField, encryptionAvailable } from "./encryption";

describe("field encryption (AES-256-GCM)", () => {
  beforeAll(() => {
    // Deterministic test key.
    process.env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  it("round-trips a value", () => {
    const secret = "national-id-123456789";
    const enc = encryptField(secret);
    expect(enc).not.toBe(secret);
    expect(enc).toContain(".");
    expect(decryptField(enc)).toBe(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const a = encryptField("same");
    const b = encryptField("same");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("same");
    expect(decryptField(b)).toBe("same");
  });

  it("passes null/undefined through", () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeNull();
    expect(decryptField(null)).toBeNull();
  });

  it("rejects tampered ciphertext (auth tag)", () => {
    const enc = encryptField("tamper-me")!;
    const [iv, tag, ct] = enc.split(".");
    // Flip a byte in the ciphertext.
    const badCt = Buffer.from(ct, "base64");
    badCt[0] ^= 0xff;
    const tampered = `${iv}.${tag}.${badCt.toString("base64")}`;
    expect(() => decryptField(tampered)).toThrow();
  });

  it("reports availability from the key", () => {
    expect(encryptionAvailable()).toBe(true);
  });
});
