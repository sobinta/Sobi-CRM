"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FieldError } from "@/components/ui/field-error";
import type { EditableContentKey } from "@/engines/platform-admin/content-keys";
import {
  setContentOverrideAction,
  clearContentOverrideAction,
} from "@/app/[locale]/(app)/platform-admin/actions";

export function EditFieldDialog({
  contentKey,
  initialValue,
  hasOverride,
  onClose,
}: {
  contentKey: EditableContentKey;
  initialValue: string;
  hasOverride: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tPlatform = useTranslations("platformAdmin");
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function save() {
    setError(undefined);
    startTransition(async () => {
      const res = await setContentOverrideAction(contentKey, locale, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function reset() {
    setError(undefined);
    startTransition(async () => {
      const res = await clearContentOverrideAction(contentKey, locale);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tPlatform("field")}: <code className="text-sm font-normal text-ink-faint">{contentKey}</code>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RichTextEditor value={value} onChange={setValue} />
          <FieldError>{error}</FieldError>
        </DialogBody>
        <DialogFooter>
          {hasOverride && (
            <Button variant="ghost" onClick={reset} disabled={pending}>
              {tPlatform("clearOverride")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            {pending ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
