"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { EmptyState } from "@/components/patterns/empty-state";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createContractAction } from "./actions";
import { LetterheadDialog } from "./letterhead-dialog";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";
import { CONTRACT_TEMPLATES } from "@/engines/contracts/template";
import { useDemoMode } from "@/components/layout/session-context";

export interface ContractRow {
  id: string;
  contractNo: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ContactOption {
  id: string;
  name: string;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  sent: "info",
  viewed: "warning",
  accepted: "positive",
  canceled: "danger",
};

export function ContractsClient({
  contracts,
  contacts,
}: {
  contracts: ContractRow[];
  contacts: ContactOption[];
}) {
  const t = useTranslations("contracts");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [simulated, setSimulated] = useState(false);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      e.currentTarget.reset();
      return;
    }
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createContractAction({
        title: form.get("title"),
        contactId: form.get("contactId") || undefined,
        templateKey: form.get("templateKey"),
        subject: form.get("subject"),
        amount: form.get("amount"),
        durationLabel: form.get("durationLabel"),
        customFields,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/crm/contracts/${res.id}`);
      }
    });
  }

  return (
    <div className="px-6 py-4">
      {simulated && (
        <p role="status" className="mb-3 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <LetterheadDialog />
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("newContract")}
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>{t("newContract")}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="title" required>
                    {t("titleLabel")}
                  </Label>
                  <Input id="title" name="title" required autoFocus placeholder={t("titlePlaceholder")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="contactId">{t("contactLabel")}</Label>
                    <NativeSelect id="contactId" name="contactId" defaultValue="">
                      <option value="">{t("noContact")}</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="templateKey">{t("templateLabel")}</Label>
                    <NativeSelect id="templateKey" name="templateKey" defaultValue="consulting">
                      {CONTRACT_TEMPLATES.map((tpl) => (
                        <option key={tpl.key} value={tpl.key}>
                          {t(`templates.${tpl.nameKey}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject" required>
                    {t("subjectLabel")}
                  </Label>
                  <Input id="subject" name="subject" required placeholder={t("subjectPlaceholder")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount" required>
                      {t("amountLabel")}
                    </Label>
                    <Input id="amount" name="amount" type="number" min={0} step={100} required dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="durationLabel">{t("durationLabel")}</Label>
                    <Input id="durationLabel" name="durationLabel" placeholder={t("durationPlaceholder")} />
                  </div>
                </div>
                <BusinessCustomFields entityKey="contract" onChange={setCustomFields} />
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? t("creating") : t("createContract")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnNo")}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnTitle")}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnAmount")}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((c) => (
                <tr key={c.id} className="bg-surface-raised transition-colors hover:bg-surface-sunken/50">
                  <td className="px-4 py-3">
                    <Link href={`/crm/contracts/${c.id}`} className="font-mono text-xs font-medium text-ink hover:text-brand">
                      {c.contractNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{c.title}</td>
                  <td className="px-4 py-3 tabular text-ink-muted" dir="ltr">
                    {c.amount.toLocaleString()} {c.currency}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[c.status] ?? "neutral"}>
                      {t(`statuses.${c.status}`)}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
