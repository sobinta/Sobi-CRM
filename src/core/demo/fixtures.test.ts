import { describe, expect, it } from "vitest";
import {
  DEMO_MODULE_KEYS,
  DEMO_READ_PERMISSIONS,
  DEMO_STAGE_FIXTURES,
} from "./fixtures";

describe("public demo fixtures", () => {
  it("grants reads without mutation wildcards", () => {
    expect(DEMO_READ_PERMISSIONS.length).toBeGreaterThan(0);
    expect(DEMO_READ_PERMISSIONS.every((value) => value.endsWith(".read"))).toBe(
      true,
    );
    expect(DEMO_READ_PERMISSIONS).not.toContain("*" as never);
  });

  it("uses stable unique module and stage identifiers", () => {
    expect(new Set(DEMO_MODULE_KEYS).size).toBe(DEMO_MODULE_KEYS.length);
    expect(new Set(DEMO_STAGE_FIXTURES.map((stage) => stage.id)).size).toBe(
      DEMO_STAGE_FIXTURES.length,
    );
  });
});
