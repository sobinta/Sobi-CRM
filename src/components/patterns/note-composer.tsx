"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addNoteAction } from "@/app/[locale]/(app)/crm/actions";

/** Inline note composer that appends to a record's timeline. */
export function NoteComposer({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      await addNoteAction(entityType, entityId, body);
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note…"
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={pending || !body.trim()}
        >
          {pending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </div>
  );
}
