import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  GLOBAL_MODELS,
  TENANT_OR_GLOBAL,
  TENANT_ROOT_MODELS,
  TENANT_SCOPED,
  TENANT_SCOPED_VIA_RELATION,
  getModelScope,
} from "./model-metadata";

describe("tenant model metadata", () => {
  it("classifies every Prisma model exactly once", () => {
    const groups = [
      TENANT_SCOPED,
      TENANT_SCOPED_VIA_RELATION,
      GLOBAL_MODELS,
      TENANT_OR_GLOBAL,
      TENANT_ROOT_MODELS,
    ];
    const occurrences = new Map<string, number>();

    for (const group of groups) {
      for (const model of group) {
        occurrences.set(model, (occurrences.get(model) ?? 0) + 1);
      }
    }

    const generatedModels = Object.values(Prisma.ModelName).sort();
    expect([...occurrences.keys()].sort()).toEqual(generatedModels);
    expect(
      [...occurrences.entries()].filter(([, count]) => count !== 1),
    ).toEqual([]);
  });

  it("returns an explicit scope for every generated model", () => {
    for (const model of Object.values(Prisma.ModelName)) {
      expect(getModelScope(model), model).not.toBeNull();
    }
  });
});
