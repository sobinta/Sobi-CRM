"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive, Check, ChevronDown, ChevronUp, Eye, History, Languages, Plus, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import type { EntityMetadata, FieldDefinition, FieldType } from "@/core/metadata/types";
import { labelFor } from "@/core/metadata/types";
import type { FormDefinition, FormFieldRef } from "@/engines/forms/types";
import { useDemoMode, useSessionUser } from "@/components/layout/session-context";
import { DynamicForm } from "@/components/patterns/dynamic-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { archiveFormVersionAction, rollbackFormAction, saveFormAction } from "./actions";

const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "currency", "boolean", "date", "datetime", "select", "multiselect", "email", "phone", "url", "relation", "user"];
type VersionRow = { id: string; version: number; status: string; label: string | null; createdAt: string };

function storageKey(tenantId: string, entityKey: string) { return `sobi:demo-form:${tenantId}:${entityKey}`; }
function fieldId(sectionId: string, key: string) { return `${sectionId}:${key}`; }

export function FormBuilder({ meta, entityLabel, initial, versions }: { meta: EntityMetadata; entityLabel: string; initial: FormDefinition; versions: VersionRow[] }) {
  const t = useTranslations("formBuilder");
  const appLocale = useLocale();
  const demo = useDemoMode();
  const user = useSessionUser();
  const [form, setForm] = useState(initial);
  const [previewLocale, setPreviewLocale] = useState(appLocale);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"draft" | "published" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const key = storageKey(user.activeTenantId, meta.key);

  useEffect(() => {
    if (!demo) return;
    const timer = window.setTimeout(() => {
      try { const saved = localStorage.getItem(key); if (saved) setForm(JSON.parse(saved)); } catch { /* keep server preview */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [demo, key]);

  const fields = useMemo(() => {
    const map = new Map(meta.fields.map((field) => [field.key, field]));
    for (const field of form.fieldDefinitions ?? []) map.set(field.key, field);
    return [...map.values()];
  }, [meta.fields, form.fieldDefinitions]);
  const previewMeta = useMemo(() => ({ ...meta, fields }), [meta, fields]);
  const used = new Set(form.sections.flatMap((section) => section.fields.map((field) => field.key)));
  const available = fields.filter((field) => !field.system && !field.archived && !used.has(field.key));

  function update(next: FormDefinition) { setForm(next); setFeedback(null); }
  function addField(sectionId: string, key: string) { update({ ...form, sections: form.sections.map((section) => section.id === sectionId ? { ...section, fields: [...section.fields, { key }] } : section) }); }
  function removeField(sectionId: string, fieldKey: string) { update({ ...form, sections: form.sections.map((section) => section.id === sectionId ? { ...section, fields: section.fields.filter((field) => field.key !== fieldKey) } : section) }); }
  function patchField(sectionId: string, fieldKey: string, patch: Partial<FormFieldRef>) { update({ ...form, sections: form.sections.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((field) => field.key === fieldKey ? { ...field, ...patch } : field) } : section) }); }
  function moveField(sectionId: string, index: number, direction: -1 | 1) { update({ ...form, sections: form.sections.map((section) => { if (section.id !== sectionId) return section; const next = [...section.fields]; const target = index + direction; if (target < 0 || target >= next.length) return section; [next[index], next[target]] = [next[target], next[index]]; return { ...section, fields: next }; }) }); }
  function moveSection(index: number, direction: -1 | 1) { const next = [...form.sections]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; update({ ...form, sections: next }); }
  function archiveField(fieldKey: string) { update({ ...form, fieldDefinitions: (form.fieldDefinitions ?? []).map((field) => field.key === fieldKey ? { ...field, archived: true } : field), sections: form.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => field.key !== fieldKey) })) }); }

  function save(publish: boolean) {
    setFeedback(null);
    if (demo) {
      try { localStorage.setItem(key, JSON.stringify(form)); setFeedback(publish ? "published" : "draft"); } catch { setFeedback("error"); }
      return;
    }
    startTransition(async () => { const result = await saveFormAction(form, publish); setFeedback(result.ok ? (publish ? "published" : "draft") : "error"); });
  }

  function rollback(version: number) { if (demo) return; startTransition(async () => { await rollbackFormAction(meta.key, version); location.reload(); }); }
  function archiveVersion(version: number) { if (demo) return; startTransition(async () => { await archiveFormVersionAction(meta.key, version); location.reload(); }); }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
      <section className="space-y-4" aria-label={t("canvas")}>
        {demo && <div className="rounded-xl border border-info/25 bg-info-subtle px-4 py-3 text-sm text-info">{t("demoNotice")}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-3 shadow-raised">
          <div><p className="font-semibold text-ink">{t("editing", { entity: entityLabel })}</p><p className="text-xs text-ink-muted">{t("versionHint")}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {feedback && <span role="status" className={cn("inline-flex items-center gap-1 text-xs", feedback === "error" ? "text-danger" : "text-positive")}><Check className="h-3.5 w-3.5" />{t(`feedback.${feedback}`)}</span>}
            <Button variant="ghost" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" />{t("history")}</Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={pending}><Save className="h-4 w-4" />{t("saveDraft")}</Button>
            <Button variant="primary" onClick={() => save(true)} disabled={pending}><Check className="h-4 w-4" />{pending ? t("publishing") : t("publish")}</Button>
          </div>
        </div>

        {form.sections.map((section, sectionIndex) => (
          <article key={section.id} className="dashboard-glow-card overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-raised">
            <header className="flex items-center gap-2 border-b border-line bg-surface-sunken/55 px-4 py-3">
              <input value={section.title ? labelFor(section.title, appLocale) : ""} onChange={(event) => update({ ...form, sections: form.sections.map((item) => item.id === section.id ? { ...item, title: typeof item.title === "object" ? { ...item.title, [appLocale]: event.target.value } : event.target.value } : item) })} aria-label={t("sectionTitle")} placeholder={t("sectionTitle")} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none" />
              <IconButton label={t("moveUp")} onClick={() => moveSection(sectionIndex, -1)}><ChevronUp /></IconButton><IconButton label={t("moveDown")} onClick={() => moveSection(sectionIndex, 1)}><ChevronDown /></IconButton>
              {form.sections.length > 1 && <IconButton label={t("deleteSection")} danger onClick={() => update({ ...form, sections: form.sections.filter((item) => item.id !== section.id) })}><Trash2 /></IconButton>}
            </header>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {!section.fields.length && <button type="button" onClick={() => setFieldOpen(true)} className="col-span-full min-h-28 rounded-xl border border-dashed border-line-strong text-sm text-ink-faint hover:border-brand hover:bg-brand-subtle hover:text-brand">{t("emptySection")}</button>}
              {section.fields.map((ref, index) => {
                const definition = fields.find((field) => field.key === ref.key); if (!definition) return null;
                const open = configuring === fieldId(section.id, ref.key);
                const custom = (form.fieldDefinitions ?? []).some((field) => field.key === ref.key);
                return <div key={ref.key} className={cn("rounded-xl border border-line bg-surface p-3", (ref.span ?? (definition.type === "textarea" ? 2 : 1)) === 2 && "sm:col-span-2")}>
                  <div className="flex items-center gap-2"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{labelFor(ref.label ?? definition.label, previewLocale)}</span><code className="text-[10px] text-ink-faint">{definition.type} · {definition.key}</code></span>
                    <IconButton label={t("moveUp")} onClick={() => moveField(section.id, index, -1)}><ChevronUp /></IconButton><IconButton label={t("moveDown")} onClick={() => moveField(section.id, index, 1)}><ChevronDown /></IconButton><IconButton label={t("configure")} active={open} onClick={() => setConfiguring(open ? null : fieldId(section.id, ref.key))}><Settings2 /></IconButton><IconButton label={t("removeFromForm")} onClick={() => removeField(section.id, ref.key)}><Trash2 /></IconButton>
                  </div>
                  {open && <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2"><Toggle label={t("required")} checked={ref.required ?? definition.required ?? false} onChange={(checked) => patchField(section.id, ref.key, { required: checked })} /><Toggle label={t("fullWidth")} checked={ref.span === 2} onChange={(checked) => patchField(section.id, ref.key, { span: checked ? 2 : 1 })} /><FieldRulesEditor fields={fields} currentKey={ref.key} ref_={ref} onPatch={(patch) => patchField(section.id, ref.key, patch)} />{custom && <Button variant="ghost" className="sm:col-span-2 text-warning" onClick={() => archiveField(ref.key)}><Archive className="h-4 w-4" />{t("archiveField")}</Button>}</div>}
                </div>;
              })}
            </div>
            <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3"><NativeSelect aria-label={t("addExisting")} defaultValue="" onChange={(event) => { if (event.target.value) addField(section.id, event.target.value); event.target.value = ""; }} className="w-auto"><option value="">{t("addExisting")}</option>{available.map((field) => <option key={field.key} value={field.key}>{labelFor(field.label, previewLocale)}</option>)}</NativeSelect><Button variant="ghost" onClick={() => setFieldOpen(true)}><Plus className="h-4 w-4" />{t("createField")}</Button></footer>
          </article>
        ))}
        <Button variant="secondary" onClick={() => update({ ...form, sections: [...form.sections, { id: crypto.randomUUID(), title: t("newSection"), fields: [] }] })}><Plus className="h-4 w-4" />{t("addSection")}</Button>
      </section>

      <aside className="xl:sticky xl:top-5 xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold text-ink"><Eye className="h-4 w-4 text-brand" />{t("livePreview")}</span><label className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-ink-faint" /><NativeSelect value={previewLocale} onChange={(event) => setPreviewLocale(event.target.value)} aria-label={t("previewLanguage")} className="h-8 w-28"><option value="fa">فارسی</option><option value="en">English</option><option value="de">Deutsch</option></NativeSelect></label></div>
          <div dir={previewLocale === "fa" ? "rtl" : "ltr"} className="max-h-[70vh] overflow-y-auto p-5"><DynamicForm meta={previewMeta} form={form} previewLocale={previewLocale} /></div>
        </div>
      </aside>

      <FieldDialog open={fieldOpen} onOpenChange={setFieldOpen} existingKeys={new Set(fields.map((field) => field.key))} onCreate={(field) => { const sectionId = form.sections.at(-1)?.id; update({ ...form, fieldDefinitions: [...(form.fieldDefinitions ?? []), field], sections: form.sections.map((section) => section.id === sectionId ? { ...section, fields: [...section.fields, { key: field.key }] } : section) }); setFieldOpen(false); }} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} versions={versions} demo={demo} pending={pending} onRollback={rollback} onArchive={archiveVersion} />
    </div>
  );
}

function IconButton({ label, children, onClick, danger, active }: { label: string; children: React.ReactElement<{ className?: string }>; onClick: () => void; danger?: boolean; active?: boolean }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink", danger && "hover:bg-danger-subtle hover:text-danger", active && "bg-brand-subtle text-brand")}>{<span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{children}</span>}</button>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-3 text-xs text-ink-muted"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>; }

function FieldRulesEditor({ fields, currentKey, ref_, onPatch }: { fields: FieldDefinition[]; currentKey: string; ref_: FormFieldRef; onPatch: (patch: Partial<FormFieldRef>) => void }) {
  const t = useTranslations("formBuilder");
  const locale = useLocale();
  const others = fields.filter((field) => field.key !== currentKey && !field.archived);
  const visible = ref_.visibleWhen && "op" in ref_.visibleWhen && ref_.visibleWhen.op === "==" ? ref_.visibleWhen.args : undefined;
  const visibleField = visible?.[0] && "var" in visible[0] ? visible[0].var : "";
  const visibleValue = visible?.[1] && "const" in visible[1] ? String(visible[1].const ?? "") : "";
  const calculated = ref_.computed && "op" in ref_.computed ? ref_.computed : undefined;
  const calculatedField = calculated?.args[0] && "var" in calculated.args[0] ? calculated.args[0].var : "";
  const calculatedValue = calculated?.args[1] && "const" in calculated.args[1] ? Number(calculated.args[1].const ?? 0) : 0;
  const setVisibility = (field: string, value: string) => onPatch({ visibleWhen: field ? { op: "==", args: [{ var: field }, { const: value }] } : undefined });
  const setCalculation = (field: string, op = calculated?.op ?? "+", value = calculatedValue) => onPatch({ computed: field ? { op, args: [{ var: field }, { const: value }] } : undefined, required: field ? false : ref_.required });
  return <div className="space-y-3 rounded-xl bg-surface-sunken p-3 sm:col-span-2">
    <div><p className="mb-2 text-xs font-semibold text-ink">{t("conditionalVisibility")}</p><div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]"><NativeSelect aria-label={t("showWhenField")} value={visibleField} onChange={(event) => setVisibility(event.target.value, visibleValue)}><option value="">{t("alwaysVisible")}</option>{others.map((field) => <option key={field.key} value={field.key}>{labelFor(field.label, locale)}</option>)}</NativeSelect><span className="self-center text-xs text-ink-faint">=</span><Input aria-label={t("equalsValue")} value={visibleValue} onChange={(event) => setVisibility(visibleField, event.target.value)} disabled={!visibleField} placeholder={t("equalsValue")} /></div></div>
    <div><p className="mb-2 text-xs font-semibold text-ink">{t("calculatedField")}</p><div className="grid gap-2 sm:grid-cols-[1fr_72px_1fr]"><NativeSelect aria-label={t("calculateFrom")} value={calculatedField} onChange={(event) => setCalculation(event.target.value)}><option value="">{t("notCalculated")}</option>{others.filter((field) => ["number", "currency"].includes(field.type)).map((field) => <option key={field.key} value={field.key}>{labelFor(field.label, locale)}</option>)}</NativeSelect><NativeSelect aria-label={t("operator")} value={calculated?.op ?? "+"} onChange={(event) => setCalculation(calculatedField, event.target.value)} disabled={!calculatedField}>{["+", "-", "*", "/"].map((op) => <option key={op}>{op}</option>)}</NativeSelect><Input aria-label={t("constant")} type="number" dir="ltr" value={calculatedValue} onChange={(event) => setCalculation(calculatedField, calculated?.op, Number(event.target.value))} disabled={!calculatedField} /></div></div>
  </div>;
}

function FieldDialog({ open, onOpenChange, existingKeys, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; existingKeys: Set<string>; onCreate: (field: FieldDefinition) => void }) {
  const t = useTranslations("formBuilder");
  const [key, setKey] = useState(""); const [type, setType] = useState<FieldType>("text"); const [fa, setFa] = useState(""); const [en, setEn] = useState(""); const [de, setDe] = useState(""); const [placeholder, setPlaceholder] = useState(""); const [helpText, setHelpText] = useState(""); const [required, setRequired] = useState(false); const [searchable, setSearchable] = useState(false); const [options, setOptions] = useState(""); const [min, setMin] = useState(""); const [max, setMax] = useState("");
  const safeKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
  const valid = /^[a-z][a-z0-9_]{0,47}$/.test(safeKey) && !existingKeys.has(safeKey) && Boolean(fa.trim() || en.trim() || de.trim()) && (!["select", "multiselect"].includes(type) || options.split("\n").some((line) => line.trim()));
  function reset() { setKey(""); setType("text"); setFa(""); setEn(""); setDe(""); setPlaceholder(""); setHelpText(""); setRequired(false); setSearchable(false); setOptions(""); setMin(""); setMax(""); }
  function create() { if (!valid) return; const labels = { fa: fa.trim() || en.trim() || de.trim(), en: en.trim() || fa.trim() || de.trim(), de: de.trim() || en.trim() || fa.trim() }; onCreate({ key: safeKey, type, label: labels, placeholder: placeholder.trim() || undefined, helpText: helpText.trim() || undefined, required, searchable, min: min === "" ? undefined : Number(min), max: max === "" ? undefined : Number(max), options: ["select", "multiselect"].includes(type) ? options.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ value: line.toLowerCase().replace(/[^a-z0-9]+/g, "_") || `option_${Math.random().toString(36).slice(2, 7)}`, label: line })) : undefined }); reset(); }
  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}><DialogContent><DialogHeader><DialogTitle>{t("newFieldTitle")}</DialogTitle></DialogHeader><DialogBody className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="field-key" required>{t("fieldKey")}</Label><Input id="field-key" dir="ltr" value={key} onChange={(event) => setKey(event.target.value)} placeholder="customer_segment" autoFocus /><p className="mt-1 text-[11px] text-ink-faint">{t("fieldKeyHint")}</p></div><div><Label htmlFor="field-type" required>{t("fieldType")}</Label><NativeSelect id="field-type" value={type} onChange={(event) => setType(event.target.value as FieldType)}>{FIELD_TYPES.map((value) => <option key={value} value={value}>{t(`types.${value}`)}</option>)}</NativeSelect></div>
    <div><Label htmlFor="label-fa">{t("labelFa")}</Label><Input id="label-fa" value={fa} onChange={(event) => setFa(event.target.value)} dir="rtl" /></div><div><Label htmlFor="label-en">{t("labelEn")}</Label><Input id="label-en" value={en} onChange={(event) => setEn(event.target.value)} dir="ltr" /></div><div><Label htmlFor="label-de">{t("labelDe")}</Label><Input id="label-de" value={de} onChange={(event) => setDe(event.target.value)} dir="ltr" /></div><div><Label htmlFor="placeholder">{t("placeholder")}</Label><Input id="placeholder" value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} /></div>
    <div className="sm:col-span-2"><Label htmlFor="help-text">{t("helpText")}</Label><Input id="help-text" value={helpText} onChange={(event) => setHelpText(event.target.value)} /></div>{["select", "multiselect"].includes(type) && <div className="sm:col-span-2"><Label htmlFor="field-options" required>{t("options")}</Label><textarea id="field-options" value={options} onChange={(event) => setOptions(event.target.value)} rows={4} className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand" placeholder={t("optionsHint")} /></div>}
    {(["text", "textarea", "number", "currency"].includes(type)) && <><div><Label htmlFor="field-min">{t("min")}</Label><Input id="field-min" type="number" dir="ltr" value={min} onChange={(event) => setMin(event.target.value)} /></div><div><Label htmlFor="field-max">{t("max")}</Label><Input id="field-max" type="number" dir="ltr" value={max} onChange={(event) => setMax(event.target.value)} /></div></>}
    <Toggle label={t("required")} checked={required} onChange={setRequired} /><Toggle label={t("searchable")} checked={searchable} onChange={setSearchable} /></DialogBody><DialogFooter><DialogClose asChild><Button variant="ghost">{t("cancel")}</Button></DialogClose><Button variant="primary" onClick={create} disabled={!valid}><Plus className="h-4 w-4" />{t("createField")}</Button></DialogFooter></DialogContent></Dialog>;
}

function HistoryDialog({ open, onOpenChange, versions, demo, pending, onRollback, onArchive }: { open: boolean; onOpenChange: (open: boolean) => void; versions: VersionRow[]; demo: boolean; pending: boolean; onRollback: (version: number) => void; onArchive: (version: number) => void }) { const t = useTranslations("formBuilder"); const locale = useLocale(); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{t("historyTitle")}</DialogTitle></DialogHeader><DialogBody><div className="space-y-2">{!versions.length && <p className="py-8 text-center text-sm text-ink-faint">{t("noVersions")}</p>}{versions.map((version) => <div key={version.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-sunken text-xs font-bold text-ink">v{version.version}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{version.label ?? t("unnamedVersion")}</span><span className="text-xs text-ink-faint">{t(`statuses.${version.status.toLowerCase()}`)} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(version.createdAt))}</span></span>{version.status !== "PUBLISHED" && !demo && <IconButton label={t("archiveVersion")} onClick={() => onArchive(version.version)}><Archive /></IconButton>}{!demo && <Button size="sm" variant="ghost" disabled={pending} onClick={() => onRollback(version.version)}><RotateCcw className="h-3.5 w-3.5" />{t("rollback")}</Button>}</div>)}</div></DialogBody><DialogFooter><DialogClose asChild><Button variant="ghost">{t("close")}</Button></DialogClose></DialogFooter></DialogContent></Dialog>; }
