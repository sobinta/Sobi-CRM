"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
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
import { createContactAction } from "../actions";
import { useDemoMode } from "@/components/layout/session-context";
import { useTranslations } from "next-intl";

export function ContactsToolbar() {
  const demoMode = useDemoMode();
  const tShell = useTranslations("shell");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [simulated, setSimulated] = useState(false);

  const applySearch = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      e.currentTarget.reset();
      return;
    }
    startTransition(async () => {
      const res = await createContactAction({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone"),
        jobTitle: form.get("jobTitle"),
        lifecycle: form.get("lifecycle"),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError("Please check the required fields.");
      }
    });
  }

  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(search);
        }}
        className="relative max-w-xs flex-1"
      >
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => applySearch(search)}
          placeholder="Search contacts…"
          className="ps-9"
        />
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New contact
        </Button>
        <DialogContent>
          <form onSubmit={onCreate}>
            <DialogHeader>
              <DialogTitle>New contact</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" required>
                    First name
                  </Label>
                  <Input id="firstName" name="firstName" required autoFocus />
                </div>
                <div>
                  <Label htmlFor="lastName" required>
                    Last name
                  </Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input id="jobTitle" name="jobTitle" />
                </div>
              </div>
              <div>
                <Label htmlFor="lifecycle">Lifecycle</Label>
                <NativeSelect id="lifecycle" name="lifecycle" defaultValue="lead">
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </NativeSelect>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="primary" type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
      {simulated && (
        <p role="status" className="mt-2 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
    </div>
  );
}
