import { describe, expect, it } from "vitest";
import { deriveDemoPassword, publicDemoEnabled } from "./config-policy";

describe("public demo configuration policy", () => {
  it("requires production to opt in explicitly", () => {
    expect(publicDemoEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      publicDemoEnabled({
        NODE_ENV: "production",
        PUBLIC_DEMO_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("keeps local development demo entry available by default", () => {
    expect(publicDemoEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(
      publicDemoEnabled({
        NODE_ENV: "development",
        PUBLIC_DEMO_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("derives a stable credential without returning the auth secret", () => {
    const password = deriveDemoPassword("a".repeat(40));
    expect(password).toHaveLength(43);
    expect(password).toBe(deriveDemoPassword("a".repeat(40)));
    expect(password).not.toContain("a".repeat(20));
  });
});
