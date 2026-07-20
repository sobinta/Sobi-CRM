import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("API cursors", () => {
  it("round trips an opaque id", () => {
    const cursor = encodeCursor("cm1234567890");
    expect(cursor).not.toContain("cm1234567890");
    expect(decodeCursor(cursor)).toBe("cm1234567890");
  });

  it("rejects malformed cursors", () => {
    expect(decodeCursor("***")).toBeUndefined();
    expect(decodeCursor("a".repeat(300))).toBeUndefined();
  });
});
