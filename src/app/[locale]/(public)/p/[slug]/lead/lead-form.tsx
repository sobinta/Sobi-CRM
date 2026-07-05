"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitLeadAction } from "./actions";

export function PublicLeadForm({
  tenantSlug,
  tenantName,
}: {
  tenantSlug: string;
  tenantName: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitLeadAction({
        tenantSlug,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
      });
      if (res.ok) setDone(true);
      else setError("Something went wrong. Please try again.");
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-positive-subtle text-positive">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-ink">Thank you</h2>
          <p className="text-sm text-ink-muted">
            We&apos;ve received your enquiry and will be in touch shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get in touch with {tenantName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div>
            <Label htmlFor="name" required>Your name</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" dir="ltr" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" dir="ltr" />
          </div>
          <div>
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" name="message" rows={3} />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button variant="primary" size="lg" type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send enquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
