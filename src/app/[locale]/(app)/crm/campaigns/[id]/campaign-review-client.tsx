"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Sparkles, Send, X, RotateCcw, Save, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
import {
  generateCampaignEmailAction,
  updateCampaignEmailAction,
  skipCampaignEmailAction,
  sendCampaignEmailAction,
} from "../actions";
import { useDemoMode } from "@/components/layout/session-context";

export interface CampaignEmailRow {
  id: string;
  toName: string;
  toEmail: string;
  context: Record<string, unknown>;
  subject: string | null;
  bodyText: string | null;
  status: string;
  error: string | null;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  pending: "neutral",
  ready: "info",
  sent: "positive",
  skipped: "neutral",
  failed: "danger",
};

export function CampaignReviewClient({
  goal,
  emails: initialEmails,
}: {
  goal: string;
  emails: CampaignEmailRow[];
}) {
  const t = useTranslations("campaigns");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [, startTransition] = useTransition();

  function patch(id: string, p: Partial<CampaignEmailRow>) {
    setEmails((rows) => rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function generateOne(id: string) {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    const res = await generateCampaignEmailAction(id);
    if (res.ok) {
      patch(id, { subject: res.subject, bodyText: res.bodyText, status: "ready" });
    }
  }

  async function generateAll() {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    setGeneratingAll(true);
    setGenProgress(0);
    const pendingIds = emails.filter((e) => e.status === "pending").map((e) => e.id);
    for (let i = 0; i < pendingIds.length; i++) {
      // Sequential — one request at a time, so no single call risks a
      // timeout and the AI provider isn't hit with a burst of parallel calls.
      await generateOne(pendingIds[i]);
      setGenProgress(i + 1);
    }
    setGeneratingAll(false);
  }

  async function sendOne(id: string) {
    const res = await sendCampaignEmailAction(id);
    if (res.ok) patch(id, { status: "sent" });
    else patch(id, { status: "failed", error: res.error ?? null });
  }

  async function sendAll() {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    setSendingAll(true);
    setSendProgress(0);
    const readyIds = emails.filter((e) => e.status === "ready").map((e) => e.id);
    for (let i = 0; i < readyIds.length; i++) {
      // Same one-at-a-time discipline as generateAll — no parallel burst of
      // outbound sends against the configured email provider.
      await sendOne(readyIds[i]);
      setSendProgress(i + 1);
    }
    setSendingAll(false);
    router.refresh();
  }

  function save(id: string, subject: string, bodyText: string) {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      await updateCampaignEmailAction(id, subject, bodyText);
    });
  }

  function skip(id: string) {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      await skipCampaignEmailAction(id);
      patch(id, { status: "skipped" });
    });
  }

  function send(id: string) {
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      await sendOne(id);
      router.refresh();
    });
  }

  const pendingCount = emails.filter((e) => e.status === "pending").length;
  const readyCount = emails.filter((e) => e.status === "ready").length;
  const total = emails.length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      {simulated && (
        <p role="status" className="text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised p-4">
        <div>
          <p className="text-sm text-ink-muted">{t("goalPrefix")}: {goal}</p>
          <p className="mt-1 text-xs text-ink-faint">{t("recipientCount", { count: total })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <Button variant="primary" onClick={generateAll} disabled={generatingAll}>
              <Sparkles className="h-4 w-4" />
              {generatingAll ? t("generatingAllProgress", { done: genProgress, total: pendingCount }) : t("generateAll", { count: pendingCount })}
            </Button>
          )}
          {readyCount > 0 && (
            <Button variant="subtle" onClick={sendAll} disabled={sendingAll}>
              <SendHorizonal className="h-4 w-4" />
              {sendingAll ? t("sendingAllProgress", { done: sendProgress, total: readyCount }) : t("sendAllReady", { count: readyCount })}
            </Button>
          )}
        </div>
      </div>

      {emails.map((email) => (
        <EmailCard
          key={email.id}
          email={email}
          t={t}
          onGenerate={() => generateOne(email.id)}
          onSave={(s, b) => save(email.id, s, b)}
          onSkip={() => skip(email.id)}
          onSend={() => send(email.id)}
        />
      ))}
    </div>
  );
}

function EmailCard({
  email,
  t,
  onGenerate,
  onSave,
  onSkip,
  onSend,
}: {
  email: CampaignEmailRow;
  t: ReturnType<typeof useTranslations<"campaigns">>;
  onGenerate: () => void;
  onSave: (subject: string, bodyText: string) => void;
  onSkip: () => void;
  onSend: () => void;
}) {
  const [subject, setSubject] = useState(email.subject ?? "");
  const [body, setBody] = useState(email.bodyText ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const editable = email.status === "ready" || email.status === "failed";
  const locked = email.status === "sent" || email.status === "skipped";

  async function handleGenerate() {
    setBusy(true);
    await onGenerate();
    setBusy(false);
  }

  return (
    <Card className={locked ? "opacity-70" : undefined}>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{email.toName}</p>
            <p className="text-xs text-ink-faint" dir="ltr">{email.toEmail}</p>
          </div>
          <Chip tone={statusTone[email.status] ?? "neutral"}>{t(`emailStatuses.${email.status}`)}</Chip>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(email.context).map(([k, v]) => (
            <span key={k} className="rounded bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-muted">
              {k}: {String(v)}
            </span>
          ))}
        </div>

        {email.status === "pending" && (
          <Button variant="subtle" size="sm" onClick={handleGenerate} disabled={busy}>
            <Sparkles className="h-3.5 w-3.5" /> {busy ? t("generating") : t("generateEmail")}
          </Button>
        )}

        {(editable || locked) && (
          <>
            <Input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
              disabled={locked}
              placeholder={t("subjectPlaceholder")}
            />
            <Textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setDirty(true); }}
              disabled={locked}
              rows={6}
              className="text-sm"
            />
            {email.error && <p className="text-xs text-danger">{email.error}</p>}
            {!locked && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onSave(subject, body); setDirty(false); }}
                  disabled={!dirty}
                >
                  <Save className="h-3.5 w-3.5" /> {t("save")}
                </Button>
                <Button variant="subtle" size="sm" onClick={handleGenerate} disabled={busy}>
                  <RotateCcw className="h-3.5 w-3.5" /> {t("regenerate")}
                </Button>
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-danger">
                  <X className="h-3.5 w-3.5" /> {t("skip")}
                </Button>
                <Button variant="primary" size="sm" onClick={onSend} className="ms-auto">
                  <Send className="h-3.5 w-3.5" /> {t("confirmAndSend")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
