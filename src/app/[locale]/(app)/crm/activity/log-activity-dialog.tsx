"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { addActivityAction, searchAction } from "../actions";
import { useDemoMode } from "@/components/layout/session-context";

interface RelatedHit {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
}

/**
 * Log a call/meeting/email/note against any record from the global Activity
 * Feed — a type-ahead picker finds the contact/company/deal/lead/task first,
 * then the same fields as the per-record dialog apply.
 */
export function LogActivityDialog() {
  const t = useTranslations("activityFeed");
  const tDialog = useTranslations("activityDialog");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [simulated, setSimulated] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RelatedHit[]>([]);
  const [related, setRelated] = useState<RelatedHit | null>(null);

  useEffect(() => {
    const q = query.trim();
    const handle = setTimeout(async () => {
      if (q.length < 2) {
        setHits([]);
        return;
      }
      const res = await searchAction(q);
      setHits(res.results.filter((r) => r.type !== "task"));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function reset() {
    setQuery("");
    setHits([]);
    setRelated(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!related) return;
    const form = new FormData(e.currentTarget);
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      reset();
      return;
    }
    startTransition(async () => {
      const res = await addActivityAction({
        entityType: related.type,
        entityId: related.id,
        kind: form.get("kind"),
        title: form.get("title"),
        body: form.get("body"),
        occurredAt: form.get("occurredAt") || undefined,
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> {t("logActivity")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{t("logActivity")}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div>
                <Label required>{t("relatedToLabel")}</Label>
                {related ? (
                  <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 py-2 text-sm">
                    <span className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[10px] uppercase text-ink-faint">
                      {related.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{related.title}</span>
                    <button
                      type="button"
                      onClick={() => setRelated(null)}
                      aria-label={t("clearRelated")}
                      className="shrink-0 rounded p-1 text-ink-faint hover:bg-surface-raised hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("relatedToPlaceholder")}
                      className="ps-9"
                      autoFocus
                    />
                    {hits.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface-overlay shadow-overlay">
                        {hits.map((hit) => (
                          <button
                            key={`${hit.type}-${hit.id}`}
                            type="button"
                            onClick={() => {
                              setRelated(hit);
                              setQuery("");
                              setHits([]);
                            }}
                            className="flex w-full items-center gap-2 px-2.5 py-2 text-start text-sm hover:bg-surface-sunken"
                          >
                            <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] uppercase text-ink-faint">
                              {hit.type}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-ink">{hit.title}</span>
                            {hit.subtitle && (
                              <span className="shrink-0 truncate text-xs text-ink-faint">
                                {hit.subtitle}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="logKind" required>
                  {tDialog("kindLabel")}
                </Label>
                <NativeSelect id="logKind" name="kind" defaultValue="call">
                  <option value="call">{tDialog("kindCall")}</option>
                  <option value="meeting">{tDialog("kindMeeting")}</option>
                  <option value="email">{tDialog("kindEmail")}</option>
                  <option value="note">{tDialog("kindNote")}</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="logTitle" required>
                  {tDialog("titleLabel")}
                </Label>
                <Input
                  id="logTitle"
                  name="title"
                  required
                  placeholder={tDialog("titlePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="logBody">{tDialog("bodyLabel")}</Label>
                <Textarea id="logBody" name="body" rows={3} />
              </div>
              <div>
                <Label htmlFor="logOccurredAt">{tDialog("whenLabel")}</Label>
                <Input id="logOccurredAt" name="occurredAt" type="date" dir="ltr" />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  {tDialog("cancel")}
                </Button>
              </DialogClose>
              <Button variant="primary" type="submit" disabled={pending || !related}>
                {pending ? tDialog("creating") : tDialog("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {simulated && (
        <p role="status" className="text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
    </div>
  );
}
