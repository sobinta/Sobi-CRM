"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createEventAction } from "../actions";

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    const start = String(form.get("start") || "09:00");
    const end = String(form.get("end") || "10:00");
    startTransition(async () => {
      const res = await createEventAction({
        title: form.get("title"),
        type: form.get("type"),
        startAt: `${date}T${start}`,
        endAt: `${date}T${end}`,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New event
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="title" required>
                Title
              </Label>
              <Input id="title" name="title" required autoFocus />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <NativeSelect id="type" name="type" defaultValue="appointment">
                <option value="appointment">Appointment</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="followup">Follow-up</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="date" required>
                Date
              </Label>
              <Input id="date" name="date" type="date" defaultValue={today} dir="ltr" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start">Start</Label>
                <Input id="start" name="start" type="time" defaultValue="09:00" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <Input id="end" name="end" type="time" defaultValue="10:00" dir="ltr" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
