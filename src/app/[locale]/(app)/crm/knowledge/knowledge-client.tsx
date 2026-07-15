"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createArticleAction, updateArticleAction, deleteArticleAction } from "./actions";

export interface ArticleRow {
  id: string;
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
}

export function KnowledgeClient({ articles }: { articles: ArticleRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ArticleRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      title: form.get("title"),
      body: form.get("body"),
      tags: form.get("tags"),
    };
    startTransition(async () => {
      const res =
        editing !== "new" && editing
          ? await updateArticleAction(editing.id, input)
          : await createArticleAction(input);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteArticleAction(id);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> مقاله‌ی جدید
        </Button>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="هنوز مقاله‌ای ثبت نشده"
          description="مقاله‌های کوتاه اینجا به عنوان منبعِ پیشنهاد محتوای AI برای لیدها استفاده می‌شوند."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-ink">{a.title}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-ink-muted">{a.body}</p>
                {a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags.map((t) => (
                      <span key={t} className="rounded bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>{editing === "new" ? "مقاله‌ی جدید" : "ویرایش مقاله"}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div>
                <Label htmlFor="title" required>عنوان</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  autoFocus
                  defaultValue={editing !== "new" ? editing?.title : ""}
                />
              </div>
              <div>
                <Label htmlFor="body" required>متن</Label>
                <Textarea
                  id="body"
                  name="body"
                  required
                  rows={6}
                  defaultValue={editing !== "new" ? editing?.body : ""}
                />
              </div>
              <div>
                <Label htmlFor="tags">برچسب‌ها (با ویرگول جدا شود)</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="مهاجرت, ویزای کار"
                  defaultValue={editing !== "new" ? editing?.tags.join(", ") : ""}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">انصراف</Button>
              </DialogClose>
              <Button variant="primary" type="submit" disabled={pending}>
                {pending ? "در حال ذخیره…" : "ذخیره"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
