"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Sparkles, Send, X, RotateCcw, Save } from "lucide-react";
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
const statusLabel: Record<string, string> = {
  pending: "در انتظار تولید",
  ready: "آماده‌ی ارسال",
  sent: "ارسال‌شده",
  skipped: "رد شده",
  failed: "ناموفق",
};

export function CampaignReviewClient({
  goal,
  emails: initialEmails,
}: {
  goal: string;
  emails: CampaignEmailRow[];
}) {
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, startTransition] = useTransition();

  function patch(id: string, p: Partial<CampaignEmailRow>) {
    setEmails((rows) => rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function generateOne(id: string) {
    const res = await generateCampaignEmailAction(id);
    if (res.ok) {
      patch(id, { subject: res.subject, bodyText: res.bodyText, status: "ready" });
    }
  }

  async function generateAll() {
    setGeneratingAll(true);
    setProgress(0);
    const pendingIds = emails.filter((e) => e.status === "pending").map((e) => e.id);
    for (let i = 0; i < pendingIds.length; i++) {
      // Sequential — one request at a time, so no single call risks a
      // timeout and the AI provider isn't hit with a burst of parallel calls.
      await generateOne(pendingIds[i]);
      setProgress(i + 1);
    }
    setGeneratingAll(false);
  }

  function save(id: string, subject: string, bodyText: string) {
    startTransition(async () => {
      await updateCampaignEmailAction(id, subject, bodyText);
    });
  }

  function skip(id: string) {
    startTransition(async () => {
      await skipCampaignEmailAction(id);
      patch(id, { status: "skipped" });
    });
  }

  function send(id: string) {
    startTransition(async () => {
      const res = await sendCampaignEmailAction(id);
      if (res.ok) patch(id, { status: "sent" });
      else patch(id, { status: "failed", error: res.error ?? null });
      router.refresh();
    });
  }

  const pendingCount = emails.filter((e) => e.status === "pending").length;
  const total = emails.length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <div className="flex items-center justify-between rounded-lg border border-line bg-surface-raised p-4">
        <div>
          <p className="text-sm text-ink-muted">هدف: {goal}</p>
          <p className="mt-1 text-xs text-ink-faint">{total} گیرنده</p>
        </div>
        {pendingCount > 0 && (
          <Button variant="primary" onClick={generateAll} disabled={generatingAll}>
            <Sparkles className="h-4 w-4" />
            {generatingAll ? `در حال تولید… (${progress}/${pendingCount})` : `تولید همه (${pendingCount})`}
          </Button>
        )}
      </div>

      {emails.map((email) => (
        <EmailCard
          key={email.id}
          email={email}
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
  onGenerate,
  onSave,
  onSkip,
  onSend,
}: {
  email: CampaignEmailRow;
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
          <Chip tone={statusTone[email.status] ?? "neutral"}>{statusLabel[email.status] ?? email.status}</Chip>
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
            <Sparkles className="h-3.5 w-3.5" /> {busy ? "در حال تولید…" : "تولید ایمیل"}
          </Button>
        )}

        {(editable || locked) && (
          <>
            <Input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
              disabled={locked}
              placeholder="موضوع ایمیل"
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
                  <Save className="h-3.5 w-3.5" /> ذخیره
                </Button>
                <Button variant="subtle" size="sm" onClick={handleGenerate} disabled={busy}>
                  <RotateCcw className="h-3.5 w-3.5" /> بازتولید
                </Button>
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-danger">
                  <X className="h-3.5 w-3.5" /> رد کردن
                </Button>
                <Button variant="primary" size="sm" onClick={onSend} className="ms-auto">
                  <Send className="h-3.5 w-3.5" /> تأیید و ارسال
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
