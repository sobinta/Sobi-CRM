"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import type { EntityMetadata } from "@/core/metadata/types";
import { labelFor } from "@/core/metadata/types";
import type { FormDefinition, FormFieldRef } from "@/engines/forms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicForm } from "@/components/patterns/dynamic-form";
import { saveFormAction } from "./actions";
import { cn } from "@/lib/utils";

export function FormBuilder({
  meta,
  initial,
}: {
  meta: EntityMetadata;
  initial: FormDefinition;
}) {
  const [form, setForm] = useState<FormDefinition>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [configuring, setConfiguring] = useState<string | null>(null);

  const usedKeys = new Set(
    form.sections.flatMap((s) => s.fields.map((f) => f.key)),
  );
  const available = meta.fields.filter(
    (f) => !usedKeys.has(f.key) && !f.system,
  );

  function update(next: FormDefinition) {
    setForm(next);
    setSaved(false);
  }

  function addField(sectionId: string, key: string) {
    update({
      ...form,
      sections: form.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, { key }] } : s,
      ),
    });
  }

  function removeField(sectionId: string, key: string) {
    update({
      ...form,
      sections: form.sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.key !== key) }
          : s,
      ),
    });
  }

  function moveField(sectionId: string, index: number, dir: -1 | 1) {
    update({
      ...form,
      sections: form.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const fields = [...s.fields];
        const j = index + dir;
        if (j < 0 || j >= fields.length) return s;
        [fields[index], fields[j]] = [fields[j], fields[index]];
        return { ...s, fields };
      }),
    });
  }

  function patchField(sectionId: string, key: string, patch: Partial<FormFieldRef>) {
    update({
      ...form,
      sections: form.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.key === key ? { ...f, ...patch } : f,
              ),
            }
          : s,
      ),
    });
  }

  function addSection() {
    update({
      ...form,
      sections: [
        ...form.sections,
        { id: crypto.randomUUID(), title: "New section", fields: [] },
      ],
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveFormAction(form);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      {/* Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            {meta.namePlural} form
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-positive">
                <Check className="h-4 w-4" /> Published
              </span>
            )}
            <Button variant="primary" onClick={save} disabled={pending}>
              {pending ? "Publishing…" : "Publish form"}
            </Button>
          </div>
        </div>

        {form.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <input
                value={
                  typeof section.title === "string" ? section.title : ""
                }
                onChange={(e) =>
                  update({
                    ...form,
                    sections: form.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, title: e.target.value }
                        : s,
                    ),
                  })
                }
                className="bg-transparent text-sm font-semibold text-ink outline-none"
                placeholder="Section title"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {section.fields.length === 0 && (
                <p className="py-2 text-sm text-ink-faint">
                  Add fields from the palette below.
                </p>
              )}
              {section.fields.map((ref, i) => {
                const def = meta.fields.find((f) => f.key === ref.key);
                if (!def) return null;
                const open = configuring === `${section.id}:${ref.key}`;
                return (
                  <div
                    key={ref.key}
                    className="rounded-lg border border-line bg-surface"
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 text-sm text-ink">
                        {labelFor(def.label, "en")}
                        <code className="ms-2 font-mono text-[11px] text-ink-faint">
                          {def.type}
                        </code>
                      </span>
                      <button
                        onClick={() => moveField(section.id, i, -1)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveField(section.id, i, 1)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setConfiguring(open ? null : `${section.id}:${ref.key}`)
                        }
                        className={cn(
                          "rounded p-1 hover:bg-surface-sunken",
                          open ? "text-brand" : "text-ink-faint hover:text-ink",
                        )}
                        aria-label="Configure"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeField(section.id, ref.key)}
                        className="rounded p-1 text-ink-faint hover:bg-danger-subtle hover:text-danger"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {open && (
                      <div className="space-y-3 border-t border-line px-3 py-3">
                        <label className="flex items-center justify-between text-sm">
                          <span className="text-ink-muted">Required</span>
                          <Switch
                            checked={ref.required ?? def.required ?? false}
                            onCheckedChange={(v) =>
                              patchField(section.id, ref.key, { required: v })
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between text-sm">
                          <span className="text-ink-muted">Full width</span>
                          <Switch
                            checked={ref.span === 2}
                            onCheckedChange={(v) =>
                              patchField(section.id, ref.key, {
                                span: v ? 2 : 1,
                              })
                            }
                          />
                        </label>
                        <ConditionEditor
                          meta={meta}
                          currentKey={ref.key}
                          value={ref.visibleWhen}
                          onChange={(cond) =>
                            patchField(section.id, ref.key, {
                              visibleWhen: cond,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Button variant="secondary" onClick={addSection}>
          <Plus className="h-4 w-4" /> Add section
        </Button>

        {available.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Field palette</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {available.map((f) => (
                <button
                  key={f.key}
                  onClick={() =>
                    addField(
                      form.sections[form.sections.length - 1].id,
                      f.key,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink hover:border-brand hover:text-brand"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {labelFor(f.label, "en")}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-ink-muted" /> Live preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicForm meta={meta} form={form} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Simple "show when field equals value" condition builder. */
function ConditionEditor({
  meta,
  currentKey,
  value,
  onChange,
}: {
  meta: EntityMetadata;
  currentKey: string;
  value?: import("@/core/rules/expression").ExprNode;
  onChange: (cond?: import("@/core/rules/expression").ExprNode) => void;
}) {
  // Parse an existing simple equality condition.
  const parsed =
    value && "op" in value && value.op === "==" && Array.isArray(value.args)
      ? {
          field:
            "var" in value.args[0]
              ? (value.args[0] as { var: string }).var
              : "",
          val:
            "const" in value.args[1]
              ? String((value.args[1] as { const: unknown }).const)
              : "",
        }
      : null;

  const [enabled, setEnabled] = useState(Boolean(parsed));
  const [field, setField] = useState(parsed?.field ?? "");
  const [val, setVal] = useState(parsed?.val ?? "");

  const others = meta.fields.filter((f) => f.key !== currentKey);

  function emit(nextField: string, nextVal: string, on: boolean) {
    if (!on || !nextField) return onChange(undefined);
    onChange({
      op: "==",
      args: [{ var: nextField }, { const: nextVal }],
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">Conditional visibility</span>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            emit(field, val, v);
          }}
        />
      </label>
      {enabled && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint">Show when</span>
          <NativeSelect
            value={field}
            onChange={(e) => {
              setField(e.target.value);
              emit(e.target.value, val, true);
            }}
            className="h-8 text-xs"
          >
            <option value="">field…</option>
            {others.map((f) => (
              <option key={f.key} value={f.key}>
                {labelFor(f.label, "en")}
              </option>
            ))}
          </NativeSelect>
          <span className="text-xs text-ink-faint">=</span>
          <Input
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              emit(field, e.target.value, true);
            }}
            placeholder="value"
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
}
