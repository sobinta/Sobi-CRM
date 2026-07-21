"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, LayoutTemplate, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
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
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "./actions";

export interface TemplateRow {
  id: string;
  kind: string;
  name: string;
  locale: string;
  subject: string;
  body: string;
  variables: string[];
}

const KINDS = ["EMAIL", "DOCUMENT", "NOTIFICATION", "REPORT", "PROMPT"] as const;
const LOCALES = ["en", "de", "fa"] as const;

/** Extract {{variable}} names from a body string for the live preview. */
function parseVars(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) found.add(m[1]);
  return [...found];
}

export function TemplatesClient({ templates }: { templates: TemplateRow[] }) {
  const t = useTranslations("studioTemplates");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [kind, setKind] = useState<string>("EMAIL");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const isEmail = editing ? editing.kind === "EMAIL" : kind === "EMAIL";
  const liveVars = parseVars(body);

  function openCreate() {
    setEditing(null);
    setKind("EMAIL");
    setBody("");
    setOpen(true);
  }

  function openEdit(row: TemplateRow) {
    setEditing(row);
    setKind(row.kind);
    setBody(row.body);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing
        ? await updateTemplateAction({
            id: editing.id,
            name: form.get("name"),
            subject: form.get("subject"),
            body: form.get("body"),
          })
        : await createTemplateAction({
            name: form.get("name"),
            kind: form.get("kind"),
            locale: form.get("locale"),
            subject: form.get("subject"),
            body: form.get("body"),
          });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function remove(row: TemplateRow) {
    if (!window.confirm(t("confirmDelete", { name: row.name }))) return;
    startTransition(async () => {
      await deleteTemplateAction(row.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("newTemplate")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? t("editTemplate") : t("newTemplate")}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div>
                <Label htmlFor="name" required>
                  {t("name")}
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  autoFocus
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              {!editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="kind" required>
                      {t("kind")}
                    </Label>
                    <NativeSelect
                      id="kind"
                      name="kind"
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`kinds.${k}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="locale" required>
                      {t("locale")}
                    </Label>
                    <NativeSelect id="locale" name="locale" defaultValue="en">
                      {LOCALES.map((l) => (
                        <option key={l} value={l}>
                          {t(`locales.${l}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              )}
              {isEmail && (
                <div>
                  <Label htmlFor="subject">{t("subject")}</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder={t("subjectPlaceholder")}
                    defaultValue={editing?.subject ?? ""}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="body" required>
                  {t("body")}
                </Label>
                <Textarea
                  id="body"
                  name="body"
                  required
                  rows={7}
                  className="font-mono text-xs"
                  placeholder={t("bodyPlaceholder")}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-faint">{t("bodyHint")}</p>
                {liveVars.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-xs text-ink-muted">
                      {t("variables")}:
                    </span>
                    {liveVars.map((v) => (
                      <Chip key={v} tone="brand" dot={false}>
                        {v}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button variant="primary" type="submit" disabled={pending}>
                {pending ? t("saving") : editing ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="space-y-2.5">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <LayoutTemplate className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{tpl.name}</h3>
                    <Chip tone="info" dot={false}>
                      {t(`kinds.${tpl.kind}`)}
                    </Chip>
                    <span className="text-xs uppercase text-ink-faint">
                      {tpl.locale}
                    </span>
                  </div>
                  {tpl.subject && (
                    <p className="mt-1 truncate text-xs text-ink-muted">
                      {tpl.subject}
                    </p>
                  )}
                  {tpl.variables.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tpl.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(tpl)}
                  aria-label={t("edit")}
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(tpl)}
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
