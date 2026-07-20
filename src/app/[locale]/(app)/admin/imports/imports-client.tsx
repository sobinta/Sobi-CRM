"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { startContactImportAction } from "./actions";

export interface ImportRow {
  id: string;
  source: string;
  status: string;
  processedRows: number;
  totalRows: number;
  createdAt: string;
}

const tone = (status: string): "neutral" | "info" | "positive" | "danger" | "warning" => {
  if (status === "SUCCEEDED") return "positive";
  if (status === "FAILED" || status === "CANCELED") return "danger";
  if (status === "PARTIAL") return "warning";
  if (status === "RUNNING") return "info";
  return "neutral";
};

export function ImportsClient({ initialRows }: { initialRows: ImportRow[] }) {
  const t = useTranslations("imports");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  function submit(formData: FormData) {
    setMessage(undefined);
    startTransition(async () => {
      try {
        const result = await startContactImportAction(formData);
        setMessage({ ok: result.ok, text: result.ok ? t("queued") : t("failed") });
      } catch {
        setMessage({ ok: false, text: t("failed") });
      }
    });
  }

  return (
    <div className="grid gap-5 px-4 pb-8 sm:px-6 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(32rem,1.3fr)]">
      <Card className="self-start border-brand-200/70">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
            <Upload aria-hidden="true" className="h-5 w-5" />
          </div>
          <CardTitle>{t("uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submit} className="space-y-4">
            <div>
              <Label htmlFor="contact-import" required>{t("fileLabel")}</Label>
              <input
                id="contact-import"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="mt-1 block min-h-11 w-full cursor-pointer rounded-md border border-line bg-surface-raised text-sm text-ink file:me-3 file:min-h-11 file:border-0 file:border-e file:border-line file:bg-surface-sunken file:px-3 file:font-medium file:text-ink hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">{t("fileHint")}</p>
            </div>
            <Button type="submit" variant="primary" disabled={pending} className="w-full sm:w-auto">
              <Upload aria-hidden="true" className="h-4 w-4" />
              {pending ? t("starting") : t("start")}
            </Button>
            <div aria-live="polite" className="min-h-5">
              {message && (
                <p className={message.ok ? "text-sm text-positive-subtle-ink" : "text-sm text-danger-subtle-ink"}>
                  {message.text}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <FileSpreadsheet aria-hidden="true" className="h-5 w-5 text-ink-muted" />
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {initialRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              {t("empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th scope="col" className="px-3 py-3 text-start font-medium">{t("file")}</th>
                    <th scope="col" className="px-3 py-3 text-start font-medium">{t("status")}</th>
                    <th scope="col" className="px-3 py-3 text-end font-medium">{t("progress")}</th>
                    <th scope="col" className="px-3 py-3 text-end font-medium">{t("created")}</th>
                  </tr>
                </thead>
                <tbody>
                  {initialRows.map((row) => (
                    <tr key={row.id} className="border-b border-line/70 last:border-0">
                      <td className="max-w-64 px-3 py-3 font-medium text-ink"><span className="block truncate" title={row.source}>{row.source}</span></td>
                      <td className="px-3 py-3"><Chip tone={tone(row.status)}>{row.status}</Chip></td>
                      <td className="px-3 py-3 text-end font-mono tabular">{row.processedRows}/{row.totalRows || "—"}</td>
                      <td className="px-3 py-3 text-end text-ink-muted">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
