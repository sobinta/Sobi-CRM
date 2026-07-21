import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/core/metadata/types";
import {
  normalizeFieldKey,
  validateCustomFieldValues,
  validateExtensionFields,
} from "./field-validation";

describe("tenant form field extensions", () => {
  const base: FieldDefinition[] = [{ key: "title", label: "Title", type: "text", system: true }];

  it("keeps system keys immutable and collisions deterministic", () => {
    expect(normalizeFieldKey(" Customer Segment ")).toBe("customer_segment");
    expect(() => validateExtensionFields(base, [{ key: "title", label: "Override", type: "number" }])).toThrow();
    expect(() => validateExtensionFields(base, [
      { key: "segment", label: "One", type: "text" },
      { key: "segment", label: "Two", type: "text" },
    ])).toThrow();
  });

  it("rejects crafted, read-only, wrong-type, and invalid-option values", () => {
    const fields: FieldDefinition[] = [
      { key: "score", label: "Score", type: "number", min: 0, max: 10, required: true },
      { key: "segment", label: "Segment", type: "select", options: [{ value: "vip", label: "VIP" }] },
      { key: "calculated", label: "Calculated", type: "number", computed: { const: 1 } },
    ];
    const result = validateCustomFieldValues(fields, { score: 12, segment: "unknown", calculated: 9, injected: true });
    expect(result.values).toEqual({});
    expect(result.errors).toEqual({ score: "Out of range", segment: "Invalid choice", calculated: "Unknown or read-only field", injected: "Unknown or read-only field" });
  });

  it("returns only validated values", () => {
    const fields: FieldDefinition[] = [
      { key: "email2", label: "Email", type: "email", required: true },
      { key: "tags", label: "Tags", type: "multiselect", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
    ];
    expect(validateCustomFieldValues(fields, { email2: "team@example.com", tags: ["a", "b"] })).toEqual({ values: { email2: "team@example.com", tags: ["a", "b"] }, errors: {} });
  });
});
