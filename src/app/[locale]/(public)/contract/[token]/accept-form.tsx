"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptContractAction } from "./actions";

export function AcceptForm({
  token,
  contractNo,
  alreadyAccepted,
  acceptedByName,
}: {
  token: string;
  contractNo: string;
  alreadyAccepted: boolean;
  acceptedByName: string | null;
}) {
  const t = useTranslations("publicContract");
  const [name, setName] = useState("");
  const [enteredNo, setEnteredNo] = useState("");
  const [done, setDone] = useState(alreadyAccepted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function accept() {
    setError(undefined);
    startTransition(async () => {
      const res = await acceptContractAction({ token, name, contractNo: enteredNo });
      if (res.ok) setDone(true);
      else setError(t("acceptError"));
    });
  }

  if (done) {
    return (
      <div className="no-print flex items-center gap-2 rounded-lg border border-positive/30 bg-positive-subtle px-4 py-3 text-sm text-positive-subtle-ink">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {acceptedByName ? t("acceptedByName", { name: acceptedByName }) : t("accepted")}
      </div>
    );
  }

  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4">
      <p className="text-sm font-medium text-ink">{t("acceptTitle")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="acceptName">{t("nameLabel")}</Label>
          <Input
            id="acceptName"
            name="acceptedByName"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div>
          <Label htmlFor="acceptContractNo">{t("contractNoLabel")}</Label>
          <Input
            id="acceptContractNo"
            name="contractNo"
            dir="ltr"
            value={enteredNo}
            onChange={(e) => setEnteredNo(e.target.value)}
            placeholder={contractNo}
          />
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> {t("printSave")}
        </Button>
        <Button
          variant="primary"
          onClick={accept}
          disabled={pending || name.trim().length < 2 || enteredNo.trim().length < 2}
        >
          {pending ? t("accepting") : t("acceptSubmit")}
        </Button>
      </div>
    </div>
  );
}
