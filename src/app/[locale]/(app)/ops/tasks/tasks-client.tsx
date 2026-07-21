"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Circle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Chip, type ChipProps } from "@/components/ui/chip";
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
import { createTaskAction, setTaskStatusAction } from "../actions";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/components/layout/session-context";
import { useTranslations } from "next-intl";

export interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  subtaskCount: number;
  commentCount: number;
}

const priorityTone: Record<string, ChipProps["tone"]> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

export function TasksClient({ tasks }: { tasks: TaskRow[] }) {
  const demoMode = useDemoMode();
  const tShell = useTranslations("shell");
  const router = useRouter();
  const [rows, setRows] = useState(tasks);
  const [open, setOpen] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [pending, startTransition] = useTransition();
  // Snapshot "now" once at mount for overdue comparison (kept out of render).
  const [now] = useState(() => Date.now());

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (demoMode) {
      setRows((current) => [
        {
          id: `demo-local-task-${crypto.randomUUID()}`,
          title: String(form.get("title")),
          status: "todo",
          priority: String(form.get("priority") || "normal"),
          dueAt: form.get("dueAt") ? String(form.get("dueAt")) : null,
          subtaskCount: 0,
          commentCount: 0,
        },
        ...current,
      ]);
      setOpen(false);
      setSimulated(true);
      e.currentTarget.reset();
      return;
    }
    startTransition(async () => {
      const res = await createTaskAction({
        title: form.get("title"),
        priority: form.get("priority"),
        dueAt: form.get("dueAt"),
        recurrence: form.get("recurrence"),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function toggle(task: TaskRow) {
    const next = task.status === "done" ? "todo" : "done";
    if (demoMode) {
      setRows((current) =>
        current.map((row) =>
          row.id === task.id ? { ...row, status: next } : row,
        ),
      );
      setSimulated(true);
      return;
    }
    startTransition(async () => {
      await setTaskStatusAction(task.id, next);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New task
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="title" required>
                    Title
                  </Label>
                  <Input id="title" name="title" required autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <NativeSelect id="priority" name="priority" defaultValue="normal">
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="dueAt">Due date</Label>
                    <Input id="dueAt" name="dueAt" type="date" dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="recurrence">Repeat</Label>
                  <NativeSelect id="recurrence" name="recurrence" defaultValue="">
                    <option value="">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </NativeSelect>
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {simulated && (
        <p role="status" className="mb-3 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Create a task to track your work and deadlines."
        />
      ) : (
        <ul className="space-y-1.5">
          {rows.map((task) => {
            const done = task.status === "done";
            const overdue =
              !done && task.dueAt && new Date(task.dueAt).getTime() < now;
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised px-4 py-2.5"
              >
                <button
                  onClick={() => toggle(task)}
                  className="shrink-0 text-ink-faint transition-colors hover:text-brand"
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-positive" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    done ? "text-ink-faint line-through" : "text-ink",
                  )}
                >
                  {task.title}
                </span>
                {overdue && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <Clock className="h-3.5 w-3.5" /> Overdue
                  </span>
                )}
                {task.dueAt && !overdue && (
                  <time className="tabular text-xs text-ink-faint">
                    {new Date(task.dueAt).toLocaleDateString()}
                  </time>
                )}
                <Chip tone={priorityTone[task.priority] ?? "neutral"}>
                  {task.priority}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
