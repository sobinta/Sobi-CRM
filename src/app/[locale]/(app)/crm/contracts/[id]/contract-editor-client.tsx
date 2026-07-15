"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Send,
  Ban,
  Wand2,
  Copy,
  Check,
  Mail,
  MessageSquareText,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateContractBodyAction,
  sendContractAction,
  cancelContractAction,
  aiRewriteContractAction,
  aiContractFollowUpAction,
} from "../actions";

export interface ContractDetail {
  id: string;
  contractNo: string;
  bodyMd: string;
  status: string;
  shareToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
}

export function ContractEditorClient({ contract }: { contract: ContractDetail }) {
  const router = useRouter();
  const [body, setBody] = useState(contract.bodyMd);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = contract.status === "accepted" || contract.status === "canceled";
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/fa/contract/${contract.shareToken}`
      : `/fa/contract/${contract.shareToken}`;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateContractBodyAction(contract.id, body);
      if (res.ok) setDirty(false);
      else setError(res.error ?? "خطا در ذخیره‌سازی.");
    });
  }

  function rewrite() {
    setError(null);
    startTransition(async () => {
      const res = await aiRewriteContractAction(contract.id);
      if (res.bodyMd) {
        setBody(res.bodyMd);
        setDirty(false);
      }
    });
  }

  function send() {
    startTransition(async () => {
      await sendContractAction(contract.id);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelContractAction(contract.id);
      router.refresh();
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function genFollowUp() {
    startTransition(async () => {
      const res = await aiContractFollowUpAction(contract.id);
      setFollowUp(res.text ?? null);
    });
  }

  const canFollowUp =
    (contract.status === "sent" || contract.status === "viewed") && !contract.acceptedAt;

  return (
    <div className="grid grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[1fr_320px]">
      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle>متن قرارداد (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            disabled={locked}
            dir="rtl"
            rows={24}
            className="font-mono text-xs leading-6"
          />
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={save} disabled={pending || !dirty || locked}>
              <Save className="h-3.5 w-3.5" /> ذخیره
            </Button>
            <Button variant="subtle" size="sm" onClick={rewrite} disabled={pending || locked}>
              <Wand2 className="h-3.5 w-3.5" /> بازنویسی با AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle + actions */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>وضعیت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-2">
              <LifecycleStep label="پیش‌نویس" done />
              <LifecycleStep label="ارسال‌شده" done={!!contract.sentAt} at={contract.sentAt} />
              <LifecycleStep label="دیده‌شده" done={!!contract.viewedAt} at={contract.viewedAt} />
              <LifecycleStep
                label={contract.status === "canceled" ? "لغوشده" : "تأییدشده"}
                done={!!contract.acceptedAt || contract.status === "canceled"}
                at={contract.acceptedAt}
                extra={contract.acceptedByName ? `توسط ${contract.acceptedByName}` : undefined}
                danger={contract.status === "canceled"}
              />
            </ol>

            {contract.status === "draft" && (
              <Button variant="primary" size="sm" className="w-full" onClick={send} disabled={pending}>
                <Send className="h-3.5 w-3.5" /> ارسال قرارداد
              </Button>
            )}
            {!locked && contract.status !== "draft" && (
              <Button variant="ghost" size="sm" className="w-full text-danger" onClick={cancel} disabled={pending}>
                <Ban className="h-3.5 w-3.5" /> لغو قرارداد
              </Button>
            )}
          </CardContent>
        </Card>

        {contract.status !== "draft" && (
          <Card>
            <CardHeader>
              <CardTitle>لینک عمومی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 py-2">
                <code className="flex-1 truncate font-mono text-[11px] text-ink" dir="ltr">
                  {publicUrl}
                </code>
                <button onClick={copyLink} className="text-ink-muted hover:text-ink" aria-label="کپی لینک">
                  {copied ? <Check className="h-4 w-4 text-positive" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <a
                href={`mailto:?subject=${encodeURIComponent(`قرارداد ${contract.contractNo}`)}&body=${encodeURIComponent(`برای مشاهده و تأیید قرارداد از لینک زیر استفاده کنید:\n${publicUrl}`)}`}
                className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-line-strong"
              >
                <Mail className="h-3.5 w-3.5" /> ارسال با ایمیل
              </a>
            </CardContent>
          </Card>
        )}

        {canFollowUp && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-accent" /> پیگیری هوشمند
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="subtle" size="sm" className="w-full" onClick={genFollowUp} disabled={pending}>
                {pending ? "در حال نوشتن…" : "تولید پیام پیگیری"}
              </Button>
              {followUp && (
                <div className="whitespace-pre-wrap rounded-md border border-line bg-surface-sunken/50 p-2.5 text-xs text-ink">
                  {followUp}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LifecycleStep({
  label,
  done,
  at,
  extra,
  danger,
}: {
  label: string;
  done: boolean;
  at?: string | null;
  extra?: string;
  danger?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
          danger
            ? "bg-danger-subtle text-danger-subtle-ink"
            : done
              ? "bg-positive-subtle text-positive-subtle-ink"
              : "bg-surface-sunken text-ink-faint"
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : ""}
      </span>
      <span className={done ? "text-ink" : "text-ink-faint"}>{label}</span>
      {(at || extra) && (
        <span className="ms-auto tabular text-xs text-ink-faint">
          {[at ? new Date(at).toLocaleDateString("fa-IR") : null, extra]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </li>
  );
}
