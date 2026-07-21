"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type { EntityMetadata, FieldDefinition } from "@/core/metadata/types";
import { labelFor } from "@/core/metadata/types";
import type { FormDefinition, FormFieldRef } from "@/engines/forms/types";
import { evaluate, evaluateBoolean } from "@/core/rules/expression";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Values = Record<string, unknown>;

/**
 * Dynamic form renderer.
 *
 * Renders a FormDefinition against entity metadata. Conditional visibility
 * (visibleWhen) and calculated fields (computed) evaluate live client-side via
 * the shared expression evaluator — the same evaluator the server uses for
 * rules, so behavior is identical on both sides.
 */
export function DynamicForm({
  meta,
  form,
  initialValues = {},
  onValuesChange,
  previewLocale,
}: {
  meta: EntityMetadata;
  form: FormDefinition;
  initialValues?: Values;
  onValuesChange?: (values: Values) => void;
  previewLocale?: string;
}) {
  const appLocale = useLocale();
  const locale = previewLocale ?? appLocale;
  const [values, setValues] = useState<Values>(initialValues);

  const fieldMap = useMemo(() => {
    const m = new Map<string, FieldDefinition>();
    for (const f of meta.fields) m.set(f.key, f);
    for (const f of form.fieldDefinitions ?? []) m.set(f.key, f);
    return m;
  }, [meta, form.fieldDefinitions]);

  // Apply computed fields into the working values for evaluation/display.
  const resolved = useMemo(() => {
    const out: Values = { ...values };
    for (const section of form.sections) {
      for (const ref of section.fields) {
        const def = fieldMap.get(ref.key);
        const expr = ref.computed ?? def?.computed;
        if (expr) out[ref.key] = evaluate(expr, out);
      }
    }
    return out;
  }, [values, form, fieldMap]);

  useEffect(() => {
    onValuesChange?.(resolved);
  }, [onValuesChange, resolved]);

  function setValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {form.sections.map((section) => {
        if (section.visibleWhen && !evaluateBoolean(section.visibleWhen, resolved))
          return null;
        return (
          <fieldset key={section.id} className="space-y-4">
            {section.title && (
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {labelFor(section.title, locale)}
              </legend>
            )}
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((ref) => {
                const def = fieldMap.get(ref.key);
                if (!def) return null;
                if (
                  ref.visibleWhen &&
                  !evaluateBoolean(ref.visibleWhen, resolved)
                )
                  return null;
                const isComputed = Boolean(ref.computed ?? def.computed);
                const span = ref.span ?? (def.type === "textarea" ? 2 : 1);
                return (
                  <div
                    key={ref.key}
                    className={cn(span === 2 && "col-span-2")}
                  >
                    <FieldControl
                      def={def}
                      ref_={ref}
                      value={resolved[ref.key]}
                      locale={locale}
                      disabled={isComputed}
                      onChange={(v) => setValue(ref.key, v)}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function FieldControl({
  def,
  ref_,
  value,
  locale,
  disabled,
  onChange,
}: {
  def: FieldDefinition;
  ref_: FormFieldRef;
  value: unknown;
  locale: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const label = labelFor(ref_.label ?? def.label, locale);
  const required = ref_.required ?? def.required;
  const id = `field-${def.key}`;
  const str = value == null ? "" : String(value);

  const control = () => {
    switch (def.type) {
      case "textarea":
        return (
          <Textarea
            id={id}
            value={str}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "boolean":
        return (
          <div className="pt-1">
            <Switch
              checked={Boolean(value)}
              disabled={disabled}
              onCheckedChange={onChange}
            />
          </div>
        );
      case "select":
        return (
          <NativeSelect
            id={id}
            value={str}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">—</option>
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {labelFor(o.label, locale)}
              </option>
            ))}
          </NativeSelect>
        );
      case "multiselect": {
        const selected = Array.isArray(value) ? value.map(String) : [];
        return (
          <select
            id={id}
            multiple
            value={selected}
            disabled={disabled}
            onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
            className="min-h-24 w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            {def.options?.map((option) => <option key={option.value} value={option.value}>{labelFor(option.label, locale)}</option>)}
          </select>
        );
      }
      case "number":
      case "currency":
        return (
          <Input
            id={id}
            type="number"
            value={str}
            disabled={disabled}
            dir="ltr"
            min={def.min}
            max={def.max}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "date":
      case "datetime":
        return (
          <Input
            id={id}
            type={def.type === "date" ? "date" : "datetime-local"}
            value={str}
            disabled={disabled}
            dir="ltr"
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            id={id}
            type={def.type === "email" ? "email" : "text"}
            value={str}
            disabled={disabled}
            dir={["email", "phone", "url"].includes(def.type) ? "ltr" : undefined}
            placeholder={def.placeholder}
            minLength={def.min}
            maxLength={def.max}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
        {disabled && (
          <span className="ms-1.5 text-xs font-normal text-ink-faint">
            (calculated)
          </span>
        )}
      </Label>
      {control()}
      {def.helpText && (
        <p className="mt-1 text-xs text-ink-faint">{def.helpText}</p>
      )}
    </div>
  );
}
