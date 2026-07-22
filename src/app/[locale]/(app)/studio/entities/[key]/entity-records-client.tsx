"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createEntityRecordAction } from "./actions";

export interface ClientField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const NATIVE_INPUT: Record<string, string> = {
  number: "number",
  currency: "number",
  date: "date",
  datetime: "datetime-local",
  email: "email",
  phone: "tel",
  url: "url",
};

export function EntityRecordsClient({
  entityKey,
  fields,
  title,
}: {
  entityKey: string;
  fields: ClientField[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const router = useRouter();

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createEntityRecordAction({ key: entityKey, data: values });
      if (res.ok) {
        setValues({});
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New {title.toLowerCase()}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>New {title.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {fields.map((f) => {
              const id = `field-${f.key}`;
              if (f.type === "boolean") {
                return (
                  <div key={f.key} className="flex items-center justify-between">
                    <Label htmlFor={id}>{f.label}</Label>
                    <Switch
                      id={id}
                      checked={Boolean(values[f.key])}
                      onCheckedChange={(v) => set(f.key, v)}
                    />
                  </div>
                );
              }
              return (
                <div key={f.key}>
                  <Label htmlFor={id} required={f.required}>
                    {f.label}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <NativeSelect
                      id={id}
                      required={f.required}
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Input
                      id={id}
                      type={NATIVE_INPUT[f.type] ?? "text"}
                      required={f.required}
                      placeholder={f.placeholder}
                      dir={NATIVE_INPUT[f.type] ? "ltr" : undefined}
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : `Create ${title.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
