import { describe, expect, it } from "vitest";
import { hasApiScope } from "./api-scopes";

describe("API key scopes", () => {
  it("accepts exact, resource wildcard, global wildcard, and legacy read", () => {
    expect(hasApiScope(["contacts:read"], "contacts:read")).toBe(true);
    expect(hasApiScope(["contacts:*"], "contacts:read")).toBe(true);
    expect(hasApiScope(["*"], "contacts:read")).toBe(true);
    expect(hasApiScope(["read"], "contacts:read")).toBe(true);
  });

  it("does not let unrelated or read-only scopes authorize writes", () => {
    expect(hasApiScope(["deals:read"], "contacts:read")).toBe(false);
    expect(hasApiScope(["contacts:read"], "contacts:write")).toBe(false);
    expect(hasApiScope(["read"], "contacts:write")).toBe(false);
  });
});
