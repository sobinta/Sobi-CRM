"use client";

import { useEffect, useState } from "react";
import type { EntityMetadata } from "@/core/metadata/types";
import type { FormDefinition } from "@/engines/forms/types";
import { loadBusinessCustomFormAction } from "@/engines/forms/business-form-actions";
import { DynamicForm } from "./dynamic-form";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { useDemoMode, useSessionUser } from "@/components/layout/session-context";

export function BusinessCustomFields({ entityKey, onChange }: { entityKey: string; onChange: (values: Record<string, unknown>) => void }) {
  const t = useTranslations("formBuilder");
  const demo = useDemoMode();
  const user = useSessionUser();
  const [result, setResult] = useState<{ canCustomize: boolean; definition: { meta: EntityMetadata; form: FormDefinition } | null } | null>(null);
  useEffect(() => { let active = true; if (demo) { try { const raw = localStorage.getItem(`sobi:demo-form:${user.activeTenantId}:${entityKey}`); if (raw) { const form = JSON.parse(raw) as FormDefinition; const definitions = (form.fieldDefinitions ?? []).filter((field) => !field.archived); const keys = new Set(definitions.map((field) => field.key)); const customForm = { ...form, fieldDefinitions: definitions, sections: form.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => keys.has(field.key)) })).filter((section) => section.fields.length) }; setResult({ canCustomize: true, definition: { meta: { key: entityKey, nameSingular: entityKey, namePlural: entityKey, source: "builtin", module: "custom", titleField: definitions[0]?.key ?? "id", fields: definitions }, form: customForm } }); return () => { active = false; }; } } catch { /* fall back to server definition */ } } void loadBusinessCustomFormAction(entityKey).then((next) => { if (active) setResult(next as typeof result); }); return () => { active = false; }; }, [demo, entityKey, user.activeTenantId]);
  if (!result) return null;
  return <div className="col-span-full space-y-3 rounded-xl border border-line bg-surface-sunken/45 p-4">{result.canCustomize && <div className="flex justify-end"><Link href={`/studio/forms?entity=${entityKey}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-brand hover:bg-brand-subtle"><Settings2 className="h-3.5 w-3.5" />{t("customizeForm")}</Link></div>}{result.definition && <DynamicForm meta={result.definition.meta} form={result.definition.form} onValuesChange={onChange} />}</div>;
}
