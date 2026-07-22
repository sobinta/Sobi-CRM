"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
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
import { addActivityAction } from "@/app/[locale]/(app)/crm/actions";
import { createTaskAction } from "@/app/[locale]/(app)/ops/actions";
import { useDemoMode } from "@/components/layout/session-context";
import { cn } from "@/lib/utils";

/**
 * A manual "add activity or task" control for any record's timeline — a call
 * or meeting log entry, or a real Task (linked to this record, so it also
 * appears in the Ops → Tasks workspace) as a reminder for what's next.
 * Reused across Contacts, Companies, and any other timelined entity.
 */
export function AddActivityDialog({
  entityType,
  entityId,
  triggerVariant = "secondary",
}: {
  entityType: string;
  entityId: string;
  triggerVariant?: "primary" | "secondary" | "ghost";
}) {
  const t = useTranslations("activityDialog");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"activity" | "task">("activity");
  const [pending, startTransition] = useTransition();
  const [simulated, setSimulated] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      e.currentTarget.reset();
      return;
    }
    startTransition(async () => {
      const res =
        tab === "activity"
          ? await addActivityAction({
              entityType,
              entityId,
              kind: form.get("kind"),
              title: form.get("title"),
              body: form.get("body"),
              occurredAt: form.get("occurredAt") || undefined,
            })
          : await createTaskAction({
              title: form.get("title"),
              priority: form.get("priority"),
              dueAt: form.get("dueAt") || undefined,
              entityType,
              entityId,
            });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <Plus className="h-3.5 w-3.5" /> {t("addActivity")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{tab === "activity" ? t("addActivity") : t("addTask")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
              <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
                {t("tabActivity")}
              </TabButton>
              <TabButton active={tab === "task"} onClick={() => setTab("task")}>
                {t("tabTask")}
              </TabButton>
            </div>

            {tab === "activity" ? (
              <>
                <div>
                  <Label htmlFor="kind" required>
                    {t("kindLabel")}
                  </Label>
                  <NativeSelect id="kind" name="kind" defaultValue="call">
                    <option value="call">{t("kindCall")}</option>
                    <option value="meeting">{t("kindMeeting")}</option>
                    <option value="email">{t("kindEmail")}</option>
                    <option value="note">{t("kindNote")}</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="activityTitle" required>
                    {t("titleLabel")}
                  </Label>
                  <Input
                    id="activityTitle"
                    name="title"
                    required
                    autoFocus
                    placeholder={t("titlePlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="body">{t("bodyLabel")}</Label>
                  <Textarea id="body" name="body" rows={3} />
                </div>
                <div>
                  <Label htmlFor="occurredAt">{t("whenLabel")}</Label>
                  <Input id="occurredAt" name="occurredAt" type="date" dir="ltr" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="taskTitle" required>
                    {t("titleLabel")}
                  </Label>
                  <Input
                    id="taskTitle"
                    name="title"
                    required
                    autoFocus
                    placeholder={t("taskTitlePlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="dueAt">{t("dueLabel")}</Label>
                    <Input id="dueAt" name="dueAt" type="date" dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="priority">{t("priorityLabel")}</Label>
                    <NativeSelect id="priority" name="priority" defaultValue="normal">
                      <option value="low">{t("priorityLow")}</option>
                      <option value="normal">{t("priorityNormal")}</option>
                      <option value="high">{t("priorityHigh")}</option>
                      <option value="urgent">{t("priorityUrgent")}</option>
                    </NativeSelect>
                  </div>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("create")}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-surface-raised text-ink shadow-raised" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
