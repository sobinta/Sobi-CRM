import { describe, expect, it } from "vitest";
import { isAllowedDemoAuthPost } from "./auth-policy";

describe("demo identity mutation policy", () => {
  it("allows sign-out", () => {
    expect(isAllowedDemoAuthPost("/api/auth/sign-out")).toBe(true);
  });

  it.each([
    "/api/auth/update-user",
    "/api/auth/change-email",
    "/api/auth/change-password",
    "/api/auth/delete-user",
    "/api/auth/revoke-sessions",
  ])("rejects %s", (pathname) => {
    expect(isAllowedDemoAuthPost(pathname)).toBe(false);
  });
});
