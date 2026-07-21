import { describe, expect, it } from "vitest";
import { demoRequestAddress, isSameOriginDemoRequest } from "./request-policy";

describe("public demo request policy", () => {
  it("accepts a same-origin browser POST", () => {
    expect(
      isSameOriginDemoRequest(
        "https://crm.example.com/api/demo/session",
        "https://crm.example.com",
        "same-origin",
      ),
    ).toBe(true);
  });

  it("rejects cross-site, malformed, and origin-less requests", () => {
    expect(
      isSameOriginDemoRequest(
        "https://crm.example.com/api/demo/session",
        "https://attacker.example",
        "cross-site",
      ),
    ).toBe(false);
    expect(
      isSameOriginDemoRequest(
        "https://crm.example.com/api/demo/session",
        "not a URL",
        "same-origin",
      ),
    ).toBe(false);
    expect(
      isSameOriginDemoRequest(
        "https://crm.example.com/api/demo/session",
        null,
        null,
      ),
    ).toBe(false);
  });

  it("uses the first proxy address", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.2" });
    expect(demoRequestAddress(headers)).toBe("203.0.113.4");
  });
});
