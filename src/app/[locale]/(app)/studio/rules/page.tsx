import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listRuleDefinitions } from "@/core/rules/service";
import { PageHeader } from "@/components/patterns/page-header";
import { RulesClient, type RuleRow } from "./rules-client";
import type { ExprNode } from "@/core/rules/expression";

/** Render a stored condition AST as a short, human-readable string. */
function summarize(node: unknown): string {
  const n = node as ExprNode | null | undefined;
  if (!n || typeof n !== "object") return "—";
  if ("op" in n) {
    if (n.op === "not" && n.args?.[0] && "op" in n.args[0] && n.args[0].op === "empty") {
      return `${summarize(n.args[0].args?.[0])} is not empty`;
    }
    if (n.op === "empty") return `${summarize(n.args?.[0])} is empty`;
    const left = summarize(n.args?.[0]);
    const right = summarize(n.args?.[1]);
    return `${left} ${n.op} ${right}`;
  }
  if ("var" in n) return n.var;
  if ("const" in n) return JSON.stringify(n.const);
  return "—";
}

export default async function RulesPage() {
  const rules = await withPlatformContext(() => listRuleDefinitions());
  if (!rules) notFound();
  const t = await getTranslations("studioRules");

  const rows: RuleRow[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    entityType: r.entityType,
    enabled: r.enabled,
    conditionSummary: summarize(r.condition),
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <RulesClient rules={rows} />
    </div>
  );
}
