"use client";

import { useState, useTransition } from "react";
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

const EVENT_OPTIONS = [
  { value: "lead.converted", label: "Lead converted" },
  { value: "deal.created", label: "Deal created" },
  { value: "deal.won", label: "Deal won" },
  { value: "contact.created", label: "Contact created" },
  { value: "task.completed", label: "Task completed" },
  { value: "file.uploaded", label: "File uploaded" },
];

const ACTION_OPTIONS = [
  { value: "create_task", label: "Create a task" },
  { value: "notify_owner", label: "Notify the owner" },
  { value: "log", label: "Write a log entry" },
];

export function AutomationsClient({
  automations,
}: {
  automations: AutomationRow[];
}) {
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
            <Plus className="h-4 w-4" /> New automation
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>New automation</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="name" required>
                    Name
                  </Label>
                  <Input id="name" name="name" required autoFocus />
                </div>
                <div>
                  <Label htmlFor="eventType" required>
                    When this happens
                  </Label>
                  <NativeSelect id="eventType" name="eventType" defaultValue="lead.converted">
                    {EVENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="actionType" required>
                    Do this
                  </Label>
                  <NativeSelect
                    id="actionType"
                    name="actionType"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                  >
                    {ACTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="actionValue">
                    {actionType === "create_task"
                      ? "Task title"
                      : "Message"}
                  </Label>
                  <Input
                    id="actionValue"
                    name="actionValue"
                    placeholder={
                      actionType === "create_task"
                        ? "Follow up with new lead"
                        : "Automation ran"
                    }
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create automation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automations yet"
          description="Automate repetitive work: when something happens, do something automatically."
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
                      {a.runCount} runs
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Chip tone="info" dot={false}>
                      {a.eventType}
                    </Chip>
                    <ArrowRight className="h-3 w-3 text-ink-faint" />
                    <span>{a.actionSummary}</span>
                  </div>
                </div>
                <Switch
                  checked={a.enabled}
                  onCheckedChange={() => toggle(a)}
                  aria-label="Toggle automation"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
