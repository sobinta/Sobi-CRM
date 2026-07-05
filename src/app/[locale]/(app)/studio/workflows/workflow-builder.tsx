"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown, Check, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
import { saveWorkflowAction } from "./actions";
import type { WorkflowStage } from "@/engines/workflow/workflow-service";

const TONES: string[] = [
  "neutral", "info", "warning", "accent", "brand", "positive", "danger",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function WorkflowBuilder({
  initial,
}: {
  initial: { key: string; name: string; entityType: string; stages: WorkflowStage[] } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "Loan approval");
  const [entityType, setEntityType] = useState(initial?.entityType ?? "loan");
  const [stages, setStages] = useState<WorkflowStage[]>(
    initial?.stages ?? [
      { key: "intake", name: "Intake", tone: "neutral", requiredFields: [], requiredDocs: [] },
      { key: "review", name: "Review", tone: "info", requiredFields: [], requiredDocs: ["ID", "Payslip"] },
      { key: "approval", name: "Approval", tone: "warning", requiredFields: [], requiredDocs: [], approvalRoleKey: "manager" },
      { key: "approved", name: "Approved", tone: "positive", requiredFields: [], requiredDocs: [] },
    ],
  );
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function patch(i: number, p: Partial<WorkflowStage>) {
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, ...p } : st)));
    setSaved(false);
  }
  function move(i: number, dir: -1 | 1) {
    setStages((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function add() {
    setStages((s) => [
      ...s,
      { key: `stage-${s.length + 1}`, name: "New stage", tone: "neutral", requiredFields: [], requiredDocs: [] },
    ]);
  }
  function remove(i: number) {
    setStages((s) => s.filter((_, idx) => idx !== i));
  }

  function save() {
    startTransition(async () => {
      const res = await saveWorkflowAction({
        key: initial?.key ?? (slugify(name) || "workflow"),
        name,
        entityType,
        stages,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="wf-name">Workflow name</Label>
          <Input id="wf-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </div>
        <div className="w-40">
          <Label htmlFor="wf-entity">Applies to</Label>
          <NativeSelect id="wf-entity" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="loan">Loans</option>
            <option value="policy">Policies</option>
            <option value="case">Cases</option>
            <option value="deal">Deals</option>
          </NativeSelect>
        </div>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Publishing…" : "Publish workflow"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 pb-2 text-sm text-positive">
            <Check className="h-4 w-4" /> Published
          </span>
        )}
      </div>

      {/* Stage flow preview */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Chip tone={s.tone as ChipProps["tone"]}>{s.name}</Chip>
            {i < stages.length - 1 && <span className="text-ink-faint">→</span>}
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {stages.map((stage, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={stage.name}
                  onChange={(e) => patch(i, { name: e.target.value, key: slugify(e.target.value) })}
                  className="h-8 max-w-48"
                />
                <NativeSelect
                  value={stage.tone}
                  onChange={(e) => patch(i, { tone: e.target.value })}
                  className="h-8 max-w-32"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </NativeSelect>
                <div className="flex-1" />
                <button onClick={() => move(i, -1)} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Up">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Down">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button onClick={() => remove(i)} className="rounded p-1 text-ink-faint hover:text-danger" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5 text-xs">
                    Required documents (comma-separated)
                  </Label>
                  <Input
                    value={stage.requiredDocs.join(", ")}
                    onChange={(e) =>
                      patch(i, {
                        requiredDocs: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    className="h-8"
                    placeholder="ID, Payslip"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <ShieldCheck className="h-3 w-3" /> Approval role
                    </Label>
                    <NativeSelect
                      value={stage.approvalRoleKey ?? ""}
                      onChange={(e) => patch(i, { approvalRoleKey: e.target.value || undefined })}
                      className="h-8"
                    >
                      <option value="">None</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </NativeSelect>
                  </div>
                  <div className="w-24">
                    <Label className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" /> SLA (h)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={stage.slaHours ?? ""}
                      onChange={(e) => patch(i, { slaHours: e.target.value ? Number(e.target.value) : undefined })}
                      className="h-8"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="secondary" onClick={add} className="mt-3">
        <Plus className="h-4 w-4" /> Add stage
      </Button>
    </div>
  );
}
