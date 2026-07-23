"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Trash2, Webhook, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/ui/chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createWebhookAction,
  deleteWebhookAction,
  createApiKeyAction,
  revokeApiKeyAction,
} from "./actions";

const EVENT_CHOICES = [
  "contact.created",
  "lead.converted",
  "deal.created",
  "deal.won",
  "task.completed",
  "file.uploaded",
];

export interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  lastStatus: number | null;
}
export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
}

export function IntegrationsClient({
  webhooks,
  apiKeys,
}: {
  webhooks: WebhookRow[];
  apiKeys: ApiKeyRow[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hookOpen, setHookOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["deal.won"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function createHook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createWebhookAction({
        name: form.get("name"),
        url: form.get("url"),
        events: selected,
      });
      if (res.ok) {
        setHookOpen(false);
        router.refresh();
      }
    });
  }

  function createKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createApiKeyAction(String(form.get("name")));
      if (res.ok) {
        setNewKey(res.key);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      {/* Webhooks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-ink-muted" /> {t("webhooksCardTitle")}
          </CardTitle>
          <Dialog open={hookOpen} onOpenChange={setHookOpen}>
            <Button variant="secondary" size="sm" onClick={() => setHookOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> {t("addWebhook")}
            </Button>
            <DialogContent>
              <form onSubmit={createHook}>
                <DialogHeader>
                  <DialogTitle>{t("newWebhook")}</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-3">
                  <div>
                    <Label htmlFor="wh-name" required>{t("whName")}</Label>
                    <Input id="wh-name" name="name" required autoFocus />
                  </div>
                  <div>
                    <Label htmlFor="wh-url" required>{t("whUrl")}</Label>
                    <Input id="wh-url" name="url" type="url" dir="ltr" placeholder="https://…" required />
                  </div>
                  <div>
                    <Label>{t("whEvents")}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_CHOICES.map((ev) => {
                        const on = selected.includes(ev);
                        return (
                          <button
                            key={ev}
                            type="button"
                            onClick={() =>
                              setSelected((s) =>
                                on ? s.filter((x) => x !== ev) : [...s, ev],
                              )
                            }
                            className={
                              on
                                ? "rounded-md bg-brand-subtle px-2 py-1 text-xs font-medium text-brand-subtle-ink"
                                : "rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:border-line-strong"
                            }
                          >
                            {ev}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </DialogBody>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" type="button">{t("cancel")}</Button>
                  </DialogClose>
                  <Button variant="primary" type="submit" disabled={pending || selected.length === 0}>
                    {t("createWebhook")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="py-2 text-sm text-ink-faint">
              {t("noWebhooks")}
            </p>
          ) : (
            <ul className="space-y-2">
              {webhooks.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{w.name}</p>
                    <p className="truncate text-xs text-ink-faint" dir="ltr">
                      {w.url}
                    </p>
                  </div>
                  <span className="text-xs text-ink-faint">
                    {t("eventsCount", { count: w.events.length })}
                  </span>
                  {w.lastStatus && (
                    <Chip tone={w.lastStatus < 400 ? "positive" : "danger"}>
                      {w.lastStatus}
                    </Chip>
                  )}
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await deleteWebhookAction(w.id);
                        router.refresh();
                      })
                    }
                    className="rounded p-1 text-ink-faint hover:text-danger"
                    aria-label={t("deleteAria")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* API keys */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-ink-muted" /> {t("apiKeysCardTitle")}
          </CardTitle>
          <Dialog
            open={keyOpen}
            onOpenChange={(o) => {
              setKeyOpen(o);
              if (!o) setNewKey(null);
            }}
          >
            <Button variant="secondary" size="sm" onClick={() => setKeyOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> {t("createKeyBtn")}
            </Button>
            <DialogContent>
              {newKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{t("copyKeyTitle")}</DialogTitle>
                  </DialogHeader>
                  <DialogBody className="space-y-3">
                    <p className="text-sm text-ink-muted">
                      {t("copyKeyNotice")}
                    </p>
                    <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2">
                      <code className="flex-1 truncate font-mono text-xs text-ink" dir="ltr">
                        {newKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(newKey);
                          setCopied(true);
                        }}
                        className="text-ink-muted hover:text-ink"
                        aria-label={t("copyAria")}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-positive" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </DialogBody>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="primary" type="button">
                        {t("done")}
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </>
              ) : (
                <form onSubmit={createKey}>
                  <DialogHeader>
                    <DialogTitle>{t("newApiKeyTitle")}</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <Label htmlFor="key-name" required>{t("keyName")}</Label>
                    <Input id="key-name" name="name" required autoFocus placeholder={t("keyNamePlaceholder")} />
                  </DialogBody>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost" type="button">{t("cancel")}</Button>
                    </DialogClose>
                    <Button variant="primary" type="submit" disabled={pending}>
                      {t("createKeyBtn")}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="py-2 text-sm text-ink-faint">
              {t("noApiKeys")}
            </p>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{k.name}</p>
                    <code className="font-mono text-xs text-ink-faint" dir="ltr">
                      {k.prefix}…
                    </code>
                  </div>
                  <span className="text-xs text-ink-faint">
                    {k.lastUsedAt
                      ? t("usedOn", { date: new Date(k.lastUsedAt).toLocaleDateString(locale) })
                      : t("neverUsed")}
                  </span>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await revokeApiKeyAction(k.id);
                        router.refresh();
                      })
                    }
                    className="rounded px-2 py-1 text-xs text-danger hover:bg-danger-subtle"
                  >
                    {t("revoke")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
