import { describe, expect, it } from "vitest";
import { normalizeContactMapping, parseCsv } from "./csv";

describe("CSV contact imports", () => {
  it("parses quoted commas and newlines", () => {
    expect(parseCsv('firstName,lastName\n"Ada, A.",Lovelace\n')).toEqual([
      ["firstName", "lastName"],
      ["Ada, A.", "Lovelace"],
    ]);
  });

  it("requires the identity columns", () => {
    expect(() => normalizeContactMapping(["email"], {})).toThrow();
    expect(normalizeContactMapping(["First Name", "surname"], {})).toEqual({
      firstName: 0,
      lastName: 1,
    });
  });
});
