"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rich text editor for super-admin-editable site content, backed by TipTap.
 * Produces sanitized-on-save HTML (see `sanitizeHtml` in
 * `@/lib/sanitize-html`, applied server-side before persisting).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 120,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3 already bundles a Link mark; disable it so our own
      // configured instance (openOnClick/autolink) doesn't collide with it.
      StarterKit.configure({ link: false }),
      TiptapLink.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "text-sm text-ink outline-none px-3 py-2",
          "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:ps-5",
          "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:ps-5",
          "[&_a]:text-brand [&_a]:underline [&_strong]:font-semibold",
          "[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold",
        ),
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  function toggleLink() {
    const url = window.prompt("URL");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-line bg-surface-raised",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-sunken/50 p-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={toggleLink}
          label="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-line" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-ink-muted outline-none transition-colors",
        "hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring",
        active && "bg-brand-subtle text-brand-subtle-ink",
      )}
    >
      {children}
    </button>
  );
}
