"use client";

import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileAction } from "../actions";

export function UploadButton() {
  const t = useTranslations("ops");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      await uploadFileAction(formData);
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onFile}
      />
      <Button
        variant="primary"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        <Upload className="h-4 w-4" /> {pending ? t("uploading") : t("uploadFile")}
      </Button>
    </>
  );
}
