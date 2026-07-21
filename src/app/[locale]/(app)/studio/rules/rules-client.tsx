"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createRuleAction, toggleRuleAction, deleteRuleAction } from "./actions";

export interface RuleRow {
  id: string;
  name: string;
  kind: string;
  entityType: string | null;
  enabled: boolean;
  conditionSummary: string;
}

const KINDS = [
  "VALIDATION",
  "ELIGIBILITY",
  "APPROVAL",
  "CALCULATION",
  "VISIBILITY",
  "COMPLIANCE",
  "CONSTRAINT",
] as const;

const OPERATORS = [
  { value: "==", key: "eq" },
  { value: "!=", key: "neq" },
  { value: ">", key: "gt" },
  { value: ">=", key: "gte" },
  { value: "<", key: "lt" },
  { value: "<=", key: "lte" },
  { value: "contains", key: "contains" },
  { value: "empty", key: "empty" },
  { value: "not_empty", key: "not_empty" },
] as const;

const UNARY = new Set(["empty", "not_empty"]);

const KIND_TONE: Record<
  string,
  "info" | "warning" | "positive" | "neutral" | "danger"
> = {
  VALIDATION: "warning",
  ELIGIBILITY: "info",
  APPROVAL: "info",
  CALCULATION: "positive",
  VISIBILITY: "neutral",
  COMPLIANCE: "danger",
  CONSTRAINT: "warning",
};

export function RulesClient({ rules }: { rules: RuleRow[] }) {
  const t = useTranslations("studioRules");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [operator, setOperator] = useState<string>("==");
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createRuleAction({
        name: form.get("name"),
        kind: form.get("kind"),
        entityType: form.get("entityType"),
        field: form.get("field"),
        operator: form.get("operator"),
        value: form.get("value"),
        message: form.get("message"),
      });
      if (res.ok) {
        setOpen(false);
        setOperator("==");
        router.refresh();
      }
    });
  }

  function toggle(row: RuleRow) {
    startTransition(async () => {
      await toggleRuleAction(row.id, !row.enabled);
      router.refresh();
    });
  }

  function remove(row: RuleRow) {
    if (!window.confirm(t("confirmDelete", { name: row.name }))) return;
    startTransition(async () => {
      await deleteRuleAction(row.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("newRule")}
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>{t("newRule")}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="name" required>
                    {t("name")}
                  </Label>
                  <Input id="name" name="name" required autoFocus />
                </div>
                <div>
                  <Label htmlFor="kind" required>
                    {t("kind")}
                  </Label>
                  <NativeSelect id="kind" name="kind" defaultValue="VALIDATION">
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`kinds.${k}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="entityType">{t("entityType")}</Label>
                  <Input
                    id="entityType"
                    name="entityType"
                    placeholder={t("entityTypePlaceholder")}
                  />
                  <p className="mt-1 text-xs text-ink-faint">{t("entityTypeHint")}</p>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div>
                    <Label htmlFor="field" required>
                      {t("field")}
                    </Label>
                    <Input id="field" name="field" placeholder="amount" required />
                  </div>
                  <div>
                    <Label htmlFor="operator" required>
                      {t("operator")}
                    </Label>
                    <NativeSelect
                      id="operator"
                      name="operator"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(`op.${o.key}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="value">{t("value")}</Label>
                    <Input
                      id="value"
                      name="value"
                      placeholder="1000"
                      disabled={UNARY.has(operator)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">{t("message")}</Label>
                  <Input
                    id="message"
                    name="message"
                    placeholder={t("messagePlaceholder")}
                  />
                  <p className="mt-1 text-xs text-ink-faint">{t("messageHint")}</p>
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="space-y-2.5">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <Scale className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{r.name}</h3>
                    <Chip tone={KIND_TONE[r.kind] ?? "neutral"} dot={false}>
                      {t(`kinds.${r.kind}`)}
                    </Chip>
                    <span className="text-xs text-ink-faint">
                      {r.entityType || t("global")}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-ink-muted">
                    {r.conditionSummary}
                  </p>
                </div>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={() => toggle(r)}
                  aria-label={t("toggle")}
                />
                <button
                  type="button"
                  onClick={() => remove(r)}
                  aria-label={t("delete")}
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger-subtle hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
