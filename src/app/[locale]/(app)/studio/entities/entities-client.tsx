"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Trash2, Shapes, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { createEntityAction } from "./actions";

interface DraftField {
  label: string;
  type: string;
}

const FIELD_TYPES = ["text", "textarea", "number", "currency", "date", "select", "email", "phone", "boolean"];

export interface EntityRow {
  id: string;
  key: string;
  nameSingular: string;
  namePlural: string;
  fieldCount: number;
  recordCount: number;
}

export function EntitiesClient({ entities }: { entities: EntityRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nameS, setNameS] = useState("");
  const [nameP, setNameP] = useState("");
  const [fields, setFields] = useState<DraftField[]>([{ label: "Name", type: "text" }]);

  function reset() {
    setNameS("");
    setNameP("");
    setFields([{ label: "Name", type: "text" }]);
  }

  function create() {
    startTransition(async () => {
      const res = await createEntityAction({
        nameSingular: nameS,
        namePlural: nameP || `${nameS}s`,
        fields: fields.filter((f) => f.label.trim()),
      });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New entity
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a custom entity</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ns" required>Singular name</Label>
                  <Input id="ns" value={nameS} onChange={(e) => setNameS(e.target.value)} placeholder="Asset" autoFocus />
                </div>
                <div>
                  <Label htmlFor="np">Plural name</Label>
                  <Input id="np" value={nameP} onChange={(e) => setNameP(e.target.value)} placeholder="Assets" />
                </div>
              </div>
              <div>
                <Label>Fields</Label>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) =>
                          setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                        }
                        placeholder="Field label"
                        className="h-8"
                      />
                      <NativeSelect
                        value={f.type}
                        onChange={(e) =>
                          setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x)))
                        }
                        className="h-8 max-w-32"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </NativeSelect>
                      {fields.length > 1 && (
                        <button
                          onClick={() => setFields((fs) => fs.filter((_, idx) => idx !== i))}
                          className="rounded p-1 text-ink-faint hover:text-danger"
                          aria-label="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setFields((fs) => [...fs, { label: "", type: "text" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add field
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">Cancel</Button>
              </DialogClose>
              <Button variant="primary" onClick={create} disabled={pending || !nameS.trim()}>
                {pending ? "Creating…" : "Create entity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entities.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="No custom entities yet"
          description="Create your own entities with custom fields — they get list views, records, and APIs automatically."
        />
      ) : (
        <div className="space-y-2.5">
          {entities.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-ink">{e.namePlural}</h3>
                  <p className="text-xs text-ink-muted">
                    <code className="font-mono">{e.key}</code> · {e.fieldCount} fields
                  </p>
                </div>
                <Chip tone="neutral">{e.recordCount} records</Chip>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
