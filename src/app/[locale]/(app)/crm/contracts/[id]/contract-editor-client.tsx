"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  Stamp,
  FileDown,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateContractBodyAction,
  sendContractAction,
  cancelContractAction,
  applySignatureAction,
  aiRewriteContractAction,
  aiContractFollowUpAction,
} from "../actions";
import { useDemoMode } from "@/components/layout/session-context";

export interface ContractDetail {
  id: string;
  contractNo: string;
  templateKey: string;
  calendarMode: string;
  bodyMd: string;
  status: string;
  shareToken: string;
  signedAt: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
}

export function ContractEditorClient({
  contract,
  signatureReady,
}: {
  contract: ContractDetail;
  signatureReady: boolean;
}) {
  const t = useTranslations("contracts");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [body, setBody] = useState(contract.bodyMd);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);

  const locked = contract.status === "accepted" || contract.status === "canceled";
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/fa/contract/${contract.shareToken}`
      : `/fa/contract/${contract.shareToken}`;

  function save() {
    setError(null);
    if (demoMode) {
      setSimulated(true);
      setDirty(false);
      return;
    }
    startTransition(async () => {
      const res = await updateContractBodyAction(contract.id, body);
      if (res.ok) setDirty(false);
      else setError(t("saveError"));
    });
  }

  function rewrite() {
    setError(null);
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      const res = await aiRewriteContractAction(contract.id);
      if (res.bodyMd) {
        setBody(res.bodyMd);
        setDirty(false);
      }
    });
  }

  function sign() {
    setActionError(null);
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      const res = await applySignatureAction(contract.id);
      if (res.ok) router.refresh();
      else setActionError(t(`signErrors.${res.reason}`));
    });
  }

  function send() {
    setActionError(null);
    if (demoMode) {
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      const res = await sendContractAction(contract.id);
      if (res.ok) router.refresh();
      else setActionError(t(`sendErrors.${res.reason}`));
    });
  }

  function cancel() {
    if (demoMode) {
      setSimulated(true);
      return;
    }
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
      {simulated && (
        <p role="status" className="lg:col-span-2 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bodyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-ink-faint">
            {t(`templates.${contract.templateKey}`)} ·{" "}
            {contract.calendarMode === "gregorian" ? t("calendarGregorian") : t("calendarJalali")}
          </p>
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
              <Save className="h-3.5 w-3.5" /> {t("save")}
            </Button>
            <Button variant="subtle" size="sm" onClick={rewrite} disabled={pending || locked}>
              <Wand2 className="h-3.5 w-3.5" /> {t("aiRewrite")}
            </Button>
            <a
              href={`/crm/contracts/${contract.id}/print?mode=pre`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink hover:border-line-strong"
            >
              <FileDown className="h-3.5 w-3.5" /> {t("downloadPreContract")}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle + actions */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("statusTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-2">
              <LifecycleStep label={t("stepDraft")} done />
              <LifecycleStep label={t("stepSigned")} done={!!contract.signedAt} at={contract.signedAt} />
              <LifecycleStep label={t("stepSent")} done={!!contract.sentAt} at={contract.sentAt} />
              <LifecycleStep label={t("stepViewed")} done={!!contract.viewedAt} at={contract.viewedAt} />
              <LifecycleStep
                label={contract.status === "canceled" ? t("stepCanceled") : t("stepAccepted")}
                done={!!contract.acceptedAt || contract.status === "canceled"}
                at={contract.acceptedAt}
                extra={contract.acceptedByName ? t("acceptedByName", { name: contract.acceptedByName }) : undefined}
                danger={contract.status === "canceled"}
              />
            </ol>

            {actionError && (
              <p className="flex items-start gap-1.5 text-xs text-danger">
                <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {actionError}
              </p>
            )}

            {contract.status === "draft" && !contract.signedAt && (
              <>
                <Button variant="primary" size="sm" className="w-full" onClick={sign} disabled={pending}>
                  <Stamp className="h-3.5 w-3.5" /> {t("signContract")}
                </Button>
                {!signatureReady && <p className="text-xs text-ink-faint">{t("signatureNotConfigured")}</p>}
              </>
            )}
            {contract.status === "draft" && contract.signedAt && (
              <Button variant="primary" size="sm" className="w-full" onClick={send} disabled={pending}>
                <Send className="h-3.5 w-3.5" /> {t("sendContract")}
              </Button>
            )}
            {!locked && contract.status !== "draft" && (
              <Button variant="ghost" size="sm" className="w-full text-danger" onClick={cancel} disabled={pending}>
                <Ban className="h-3.5 w-3.5" /> {t("cancelContract")}
              </Button>
            )}
          </CardContent>
        </Card>

        {contract.status !== "draft" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("publicLinkTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 py-2">
                <code className="flex-1 truncate font-mono text-[11px] text-ink" dir="ltr">
                  {publicUrl}
                </code>
                <button onClick={copyLink} className="text-ink-muted hover:text-ink" aria-label={t("copyLink")}>
                  {copied ? <Check className="h-4 w-4 text-positive" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <a
                href={`mailto:?subject=${encodeURIComponent(`${t("emailSubjectPrefix")} ${contract.contractNo}`)}&body=${encodeURIComponent(`${t("emailBodyPrefix")}\n${publicUrl}`)}`}
                className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-line-strong"
              >
                <Mail className="h-3.5 w-3.5" /> {t("emailShare")}
              </a>
              <a
                href={`/crm/contracts/${contract.id}/print?mode=final`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-line-strong"
              >
                <FileDown className="h-3.5 w-3.5" /> {t("downloadFinalPdf")}
              </a>
            </CardContent>
          </Card>
        )}

        {canFollowUp && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-accent" /> {t("followUpTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="subtle" size="sm" className="w-full" onClick={genFollowUp} disabled={pending}>
                {pending ? t("followUpGenerating") : t("generateFollowUp")}
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
          {[at ? new Date(at).toLocaleDateString() : null, extra].filter(Boolean).join(" · ")}
        </span>
      )}
    </li>
  );
}
