"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  createAutomationAction,
  toggleAutomationAction,
} from "./actions";

export interface AutomationRow {
  id: string;
  name: string;
  eventType: string;
  enabled: boolean;
  actionSummary: string;
  runCount: number;
}

// Event type values are the raw dotted strings stored on the automation
// trigger; translation keys can't contain "." (next-intl reserves it for
// nesting), so each maps to a safe camelCase key under `events.*`.
const EVENT_TYPE_TO_KEY: Record<string, string> = {
  "lead.converted": "leadConverted",
  "deal.created": "dealCreated",
  "deal.won": "dealWon",
  "contact.created": "contactCreated",
  "task.completed": "taskCompleted",
  "file.uploaded": "fileUploaded",
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_TO_KEY);

const ACTION_KEYS = ["create_task", "notify_owner", "log"];

export function AutomationsClient({
  automations,
}: {
  automations: AutomationRow[];
}) {
  const t = useTranslations("studioAutomations");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState("create_task");
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createAutomationAction({
        name: form.get("name"),
        eventType: form.get("eventType"),
        actionType: form.get("actionType"),
        actionValue: form.get("actionValue"),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function toggle(row: AutomationRow) {
    startTransition(async () => {
      await toggleAutomationAction(row.id, !row.enabled);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("newAutomation")}
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>{t("newAutomation")}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="name" required>
                    {t("name")}
                  </Label>
                  <Input id="name" name="name" required autoFocus />
                </div>
                <div>
                  <Label htmlFor="eventType" required>
                    {t("whenThisHappens")}
                  </Label>
                  <NativeSelect id="eventType" name="eventType" defaultValue="lead.converted">
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`events.${EVENT_TYPE_TO_KEY[type]}` as never)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="actionType" required>
                    {t("doThis")}
                  </Label>
                  <NativeSelect
                    id="actionType"
                    name="actionType"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                  >
                    {ACTION_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t(`actionTypes.${key}` as never)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="actionValue">
                    {actionType === "create_task"
                      ? t("taskTitle")
                      : t("message")}
                  </Label>
                  <Input
                    id="actionValue"
                    name="actionValue"
                    placeholder={
                      actionType === "create_task"
                        ? t("taskTitlePlaceholder")
                        : t("messagePlaceholder")
                    }
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? t("creating") : t("createAutomation")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <EmptyState
          icon={Zap}
          title={t("noAutomationsTitle")}
          description={t("noAutomationsBody")}
        />
      ) : (
        <div className="space-y-2.5">
          {automations.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{a.name}</h3>
                    <span className="text-xs text-ink-faint">
                      {t("runCount", { count: a.runCount })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Chip tone="info" dot={false}>
                      {EVENT_TYPE_TO_KEY[a.eventType] ? t(`events.${EVENT_TYPE_TO_KEY[a.eventType]}` as never) : a.eventType}
                    </Chip>
                    <ArrowRight className="h-3 w-3 text-ink-faint" />
                    <span>{a.actionSummary}</span>
                  </div>
                </div>
                <Switch
                  checked={a.enabled}
                  onCheckedChange={() => toggle(a)}
                  aria-label={t("toggleAria")}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
