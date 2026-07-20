import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

describe("Content Security Policy", () => {
  it("uses a strict nonce and no unsafe inline scripts in production", () => {
    const policy = contentSecurityPolicy("nonce-value", false);
    expect(policy).toContain("'nonce-nonce-value'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
  });

  it("allows eval only for the development runtime", () => {
    expect(contentSecurityPolicy("dev", true)).toContain("'unsafe-eval'");
  });
});
