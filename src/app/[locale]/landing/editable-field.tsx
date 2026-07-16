"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditableContentKey } from "@/engines/platform-admin/content-keys";

const EditFieldDialog = dynamic(
  () => import("./edit-field-dialog").then((m) => m.EditFieldDialog),
  { ssr: false },
);

/**
 * Wraps a piece of landing-page copy. For regular visitors this renders
 * inert (no client cost beyond this thin component). When `editMode` is on
 * (super admin viewing "/"), hovering reveals a pencil that opens the rich
 * text editor — the heavy editor bundle only loads once that dialog mounts.
 */
export function EditableField({
  as: Tag = "span",
  contentKey,
  value,
  hasOverride,
  editMode,
  className,
}: {
  as?: keyof React.JSX.IntrinsicElements;
  contentKey: EditableContentKey;
  value: string;
  hasOverride: boolean;
  editMode: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const content = hasOverride ? (
    <Tag className={className} dangerouslySetInnerHTML={{ __html: value }} />
  ) : (
    <Tag className={className}>{value}</Tag>
  );

  if (!editMode) return content;

  return (
    <span className="group relative inline-block">
      {content}
      {/* A real <button> here would be invalid HTML when this field renders
          inside a Link/DemoCtaButton (e.g. hero.ctaPrimary/ctaSecondary) —
          interactive elements can't nest. A span+role mimics it instead. */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
        aria-label="Edit"
        className={cn(
          "absolute -top-2 -end-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full",
          "border border-line bg-surface-raised text-ink-muted shadow-raised outline-none",
          "hover:text-brand focus-visible:flex focus-visible:outline-2 focus-visible:outline-focus-ring",
          "group-hover:flex",
        )}
      >
        <Pencil className="h-3 w-3" />
      </span>
      {open && (
        <EditFieldDialog
          contentKey={contentKey}
          initialValue={value}
          hasOverride={hasOverride}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
