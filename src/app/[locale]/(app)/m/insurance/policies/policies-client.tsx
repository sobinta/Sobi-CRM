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
import { createPolicyAction } from "../actions";

export function NewPolicyButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPolicyAction({
        policyNumber: form.get("policyNumber"),
        product: form.get("product"),
        premium: form.get("premium"),
        commission: form.get("commission"),
        expiresAt: form.get("expiresAt"),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New policy
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>New policy</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="policyNumber" required>Policy number</Label>
                <Input id="policyNumber" name="policyNumber" required autoFocus />
              </div>
              <div>
                <Label htmlFor="product" required>Product</Label>
                <NativeSelect id="product" name="product" defaultValue="auto">
                  <option value="auto">Auto</option>
                  <option value="home">Home</option>
                  <option value="life">Life</option>
                  <option value="health">Health</option>
                  <option value="business">Business</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="premium">Premium</Label>
                <Input id="premium" name="premium" type="number" min={0} defaultValue={0} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="commission">Commission</Label>
                <Input id="commission" name="commission" type="number" min={0} defaultValue={0} dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="expiresAt">Expiry date</Label>
              <Input id="expiresAt" name="expiresAt" type="date" dir="ltr" />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">Cancel</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
