/**
 * Safe expression evaluator.
 *
 * Conditions and calculations are stored as a JSON AST and evaluated against a
 * context object — never with `eval`/`Function`. This is the single evaluator
 * shared by the Business Rules Engine, form conditional logic / calculated
 * fields, and automation conditions.
 *
 * AST node shapes:
 *   { const: <literal> }
 *   { var: "path.to.value" }              // dot-path lookup into context
 *   { op: "==", args: [Node, Node] }      // comparison / arithmetic / logic
 *   { fn: "upper", args: [Node, ...] }    // whitelisted function call
 *
 * Everything is total: unknown vars resolve to undefined, type errors yield
 * false/NaN rather than throwing, so a bad rule can never crash a request.
 */

export type ExprNode =
  | { const: unknown }
  | { var: string }
  | { op: string; args: ExprNode[] }
  | { fn: string; args: ExprNode[] };

export type EvalContext = Record<string, unknown>;

const MAX_DEPTH = 64;

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function getPath(ctx: EvalContext, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    // Never traverse the prototype chain — only own properties, and never
    // dangerous keys. Prevents prototype access/pollution via crafted paths.
    if (BLOCKED_KEYS.has(key)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(acc, key)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, ctx);
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  if (typeof v === "boolean") return v ? 1 : 0;
  return NaN;
}

function equals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // loose numeric compare for form values (strings from inputs)
  const na = toNum(a);
  const nb = toNum(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return false;
}

const OPERATORS: Record<string, (args: unknown[]) => unknown> = {
  // logic
  and: (a) => a.every(Boolean),
  or: (a) => a.some(Boolean),
  not: (a) => !a[0],
  // comparison
  "==": (a) => equals(a[0], a[1]),
  "!=": (a) => !equals(a[0], a[1]),
  ">": (a) => toNum(a[0]) > toNum(a[1]),
  ">=": (a) => toNum(a[0]) >= toNum(a[1]),
  "<": (a) => toNum(a[0]) < toNum(a[1]),
  "<=": (a) => toNum(a[0]) <= toNum(a[1]),
  // membership
  in: (a) => Array.isArray(a[1]) && a[1].some((x) => equals(x, a[0])),
  contains: (a) =>
    typeof a[0] === "string" && typeof a[1] === "string"
      ? a[0].includes(a[1])
      : Array.isArray(a[0]) && a[0].some((x) => equals(x, a[1])),
  empty: (a) =>
    a[0] == null || a[0] === "" || (Array.isArray(a[0]) && a[0].length === 0),
  // arithmetic
  "+": (a) => a.reduce<number>((s, x) => s + toNum(x), 0),
  "-": (a) => toNum(a[0]) - toNum(a[1]),
  "*": (a) => a.reduce<number>((s, x) => s * toNum(x), 1),
  "/": (a) => toNum(a[0]) / toNum(a[1]),
  "%": (a) => toNum(a[0]) % toNum(a[1]),
};

const FUNCTIONS: Record<string, (args: unknown[]) => unknown> = {
  upper: (a) => String(a[0] ?? "").toUpperCase(),
  lower: (a) => String(a[0] ?? "").toLowerCase(),
  trim: (a) => String(a[0] ?? "").trim(),
  length: (a) =>
    typeof a[0] === "string" || Array.isArray(a[0])
      ? (a[0] as { length: number }).length
      : 0,
  round: (a) => Math.round(toNum(a[0])),
  floor: (a) => Math.floor(toNum(a[0])),
  ceil: (a) => Math.ceil(toNum(a[0])),
  abs: (a) => Math.abs(toNum(a[0])),
  min: (a) => Math.min(...a.map(toNum)),
  max: (a) => Math.max(...a.map(toNum)),
  coalesce: (a) => a.find((x) => x != null) ?? null,
  concat: (a) => a.map((x) => String(x ?? "")).join(""),
  if: (a) => (a[0] ? a[1] : a[2]),
  now: () => Date.now(),
};

export function evaluate(
  node: ExprNode | undefined | null,
  ctx: EvalContext,
  depth = 0,
): unknown {
  if (node == null) return undefined;
  if (depth > MAX_DEPTH) return undefined;

  if ("const" in node) return node.const;
  if ("var" in node) return getPath(ctx, node.var);

  if ("op" in node) {
    const fn = OPERATORS[node.op];
    if (!fn) return undefined;
    const args = (node.args ?? []).map((n) => evaluate(n, ctx, depth + 1));
    try {
      return fn(args);
    } catch {
      return undefined;
    }
  }

  if ("fn" in node) {
    const fn = FUNCTIONS[node.fn];
    if (!fn) return undefined;
    const args = (node.args ?? []).map((n) => evaluate(n, ctx, depth + 1));
    try {
      return fn(args);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/** Evaluate a node to a strict boolean (for conditions/visibility/gates). */
export function evaluateBoolean(
  node: ExprNode | undefined | null,
  ctx: EvalContext,
): boolean {
  // No condition = always true (a gate with no requirement passes).
  if (node == null) return true;
  return Boolean(evaluate(node, ctx));
}

/** Whitelisted operator/function names — for editor tooling and validation. */
export const KNOWN_OPERATORS = Object.keys(OPERATORS);
export const KNOWN_FUNCTIONS = Object.keys(FUNCTIONS);
