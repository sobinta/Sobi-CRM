"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptContractAction } from "./actions";

export function AcceptForm({
  token,
  alreadyAccepted,
  acceptedByName,
}: {
  token: string;
  alreadyAccepted: boolean;
  acceptedByName: string | null;
}) {
  const [name, setName] = useState("");
  const [done, setDone] = useState(alreadyAccepted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function accept() {
    setError(undefined);
    startTransition(async () => {
      const res = await acceptContractAction({ token, name });
      if (res.ok) setDone(true);
      else setError("نام را کامل وارد کنید.");
    });
  }

  if (done) {
    return (
      <div className="no-print flex items-center gap-2 rounded-lg border border-positive/30 bg-positive-subtle px-4 py-3 text-sm text-positive-subtle-ink">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        این قرارداد {acceptedByName ? `توسط ${acceptedByName} ` : ""}تأیید شده است.
      </div>
    );
  }

  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="acceptName">تأیید قرارداد با درج نام</Label>
        <Input
          id="acceptName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام و نام خانوادگی"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> چاپ / ذخیره PDF
        </Button>
        <Button variant="primary" onClick={accept} disabled={pending || name.trim().length < 2}>
          {pending ? "در حال ثبت…" : "تأیید می‌کنم"}
        </Button>
      </div>
    </div>
  );
}
