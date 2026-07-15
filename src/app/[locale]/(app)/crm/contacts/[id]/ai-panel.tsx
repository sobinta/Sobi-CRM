"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Sparkles, Wand2, ListChecks, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  summarizeContactAction,
  suggestNextStepAction,
  summarizeConversationAction,
} from "@/app/[locale]/(app)/ai/actions";

/** AI assistant actions for a contact — summary, next-step, conversation digest. */
export function ContactAiPanel({
  contactId,
  hasConversation,
}: {
  contactId: string;
  hasConversation: boolean;
}) {
  const [output, setOutput] = useState<string>();
  const [note, setNote] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function summarize() {
    setNote(undefined);
    startTransition(async () => {
      const res = await summarizeContactAction(contactId);
      setOutput(res.text);
    });
  }

  function nextStep() {
    setOutput(undefined);
    startTransition(async () => {
      const res = await suggestNextStepAction(contactId);
      setNote(`پیشنهاد: «${res.suggestion}» — برای تأیید به مرکز اقدامات AI ارسال شد.`);
      router.refresh();
    });
  }

  function summarizeConvo() {
    setOutput(undefined);
    setNote(undefined);
    startTransition(async () => {
      const res = await summarizeConversationAction(contactId);
      if (res.summary) {
        setNote("خلاصه‌ی گفتگو در کارت «شناخت مشتری» به‌روزرسانی شد.");
        router.refresh();
      } else {
        setNote("گفتگویی برای این مخاطب یافت نشد.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="subtle" size="sm" onClick={summarize} disabled={pending}>
          <Sparkles className="h-4 w-4" /> خلاصه
        </Button>
        <Button variant="subtle" size="sm" onClick={nextStep} disabled={pending}>
          <Wand2 className="h-4 w-4" /> پیشنهاد اقدام بعدی
        </Button>
        {hasConversation && (
          <Button variant="subtle" size="sm" onClick={summarizeConvo} disabled={pending}>
            <MessagesSquare className="h-4 w-4" /> خلاصه‌ی گفتگو
          </Button>
        )}
      </div>
      {pending && <p className="text-sm text-ink-faint">در حال پردازش…</p>}
      {output && (
        <div className="rounded-lg border border-line bg-surface-sunken/50 p-3 text-sm text-ink">
          {output}
        </div>
      )}
      {note && (
        <p className="flex items-start gap-1.5 text-sm text-accent-subtle-ink">
          <ListChecks className="mt-0.5 h-4 w-4 shrink-0" />
          {note}
        </p>
      )}
    </div>
  );
}
