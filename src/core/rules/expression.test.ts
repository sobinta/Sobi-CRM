import { describe, it, expect } from "vitest";
import { evaluate, evaluateBoolean, type ExprNode } from "./expression";

describe("expression evaluator", () => {
  const ctx = {
    amount: 5000,
    status: "approved",
    tags: ["vip", "renewal"],
    applicant: { income: 60000, employed: true },
    name: "  Coreline  ",
  };

  it("resolves constants and vars (incl. dot paths)", () => {
    expect(evaluate({ const: 42 }, ctx)).toBe(42);
    expect(evaluate({ var: "amount" }, ctx)).toBe(5000);
    expect(evaluate({ var: "applicant.income" }, ctx)).toBe(60000);
    expect(evaluate({ var: "missing.deep.path" }, ctx)).toBeUndefined();
  });

  it("evaluates comparisons with loose numeric coercion", () => {
    expect(
      evaluate({ op: ">", args: [{ var: "amount" }, { const: 1000 }] }, ctx),
    ).toBe(true);
    // string input compared to number
    expect(evaluate({ op: "==", args: [{ const: "5000" }, { var: "amount" }] }, ctx)).toBe(
      true,
    );
  });

  it("evaluates logic, membership, and emptiness", () => {
    const node: ExprNode = {
      op: "and",
      args: [
        { op: "==", args: [{ var: "status" }, { const: "approved" }] },
        { op: "in", args: [{ const: "vip" }, { var: "tags" }] },
      ],
    };
    expect(evaluateBoolean(node, ctx)).toBe(true);
    expect(evaluateBoolean({ op: "empty", args: [{ var: "tags" }] }, ctx)).toBe(
      false,
    );
  });

  it("evaluates arithmetic and functions (calculated fields)", () => {
    expect(
      evaluate(
        { op: "*", args: [{ var: "amount" }, { const: 0.15 }] },
        ctx,
      ),
    ).toBe(750);
    expect(evaluate({ fn: "trim", args: [{ var: "name" }] }, ctx)).toBe(
      "Coreline",
    );
    expect(
      evaluate(
        { fn: "if", args: [{ var: "applicant.employed" }, { const: "ok" }, { const: "no" }] },
        ctx,
      ),
    ).toBe("ok");
  });

  it("is total: unknown ops/fns and bad input never throw", () => {
    expect(evaluate({ op: "danger", args: [] } as ExprNode, ctx)).toBeUndefined();
    expect(evaluate({ fn: "process", args: [] } as ExprNode, ctx)).toBeUndefined();
    // a missing condition is treated as "always true"
    expect(evaluateBoolean(null, ctx)).toBe(true);
    expect(evaluateBoolean(undefined, ctx)).toBe(true);
  });

  it("does not execute arbitrary code (no eval surface)", () => {
    // A var named like a JS global resolves to undefined, not the global.
    expect(evaluate({ var: "constructor" }, ctx)).toBeUndefined();
    expect(evaluate({ var: "__proto__.polluted" }, ctx)).toBeUndefined();
  });
});
