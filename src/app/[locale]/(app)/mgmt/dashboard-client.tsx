"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import GridLayout, {
  useContainerWidth,
  type Layout as RGLLayout,
} from "react-grid-layout";
import { Plus, Pencil, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WidgetRenderer } from "@/components/patterns/widgets/widget-renderer";
import {
  WIDGET_CATALOG,
  type LayoutItem,
  type WidgetData,
  type WidgetType,
} from "@/components/patterns/widgets/widget-types";
import { saveDashboardAction } from "./actions";
import { cn } from "@/lib/utils";
import "react-grid-layout/css/styles.css";

const COLS = 12;
const ROW_HEIGHT = 56;

export function DashboardClient({
  initialLayout,
  data,
}: {
  initialLayout: LayoutItem[];
  data: WidgetData;
}) {
  const [items, setItems] = useState<LayoutItem[]>(initialLayout);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const idCounter = useRef(0);
  const { width, containerRef, mounted } = useContainerWidth();

  const onLayoutChange = useCallback(
    (layout: RGLLayout) => {
      if (!editing) return;
      setItems((prev) =>
        prev.map((it) => {
          const l = layout.find((x) => x.i === it.i);
          return l ? { ...it, x: l.x, y: l.y, w: l.w, h: l.h } : it;
        }),
      );
    },
    [editing],
  );

  function addWidget(type: WidgetType) {
    const spec = WIDGET_CATALOG.find((w) => w.type === type)!;
    const id = `${type}-${idCounter.current++}`;
    setItems((prev) => [
      ...prev,
      {
        i: id,
        x: 0,
        y: Infinity as unknown as number, // drop at bottom
        w: spec.defaultSize.w,
        h: spec.defaultSize.h,
        type,
      },
    ]);
  }

  function removeWidget(id: string) {
    setItems((prev) => prev.filter((it) => it.i !== id));
  }

  function save() {
    startTransition(async () => {
      await saveDashboardAction(items);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2 px-6">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-positive">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {editing ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <Plus className="h-4 w-4" /> Add widget
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {WIDGET_CATALOG.map((w) => (
                  <DropdownMenuItem
                    key={w.type}
                    onSelect={() => addWidget(w.type)}
                  >
                    {w.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={pending}>
              <Check className="h-4 w-4" /> {pending ? "Saving…" : "Save layout"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit dashboard
          </Button>
        )}
      </div>

      <div className="px-4" ref={containerRef}>
        {mounted && (
        <GridLayout
          className="layout"
          width={width}
          layout={items as unknown as RGLLayout}
          gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [16, 16] }}
          dragConfig={{ enabled: editing, cancel: ".widget-remove" }}
          resizeConfig={{ enabled: editing }}
          onLayoutChange={onLayoutChange}
        >
          {items.map((item) => (
            <div
              key={item.i}
              className={cn(
                "group relative overflow-x-auto rounded-xl border bg-surface-raised shadow-raised",
                editing ? "cursor-move border-brand/40" : "border-line",
              )}
            >
              {editing && (
                <button
                  onClick={() => removeWidget(item.i)}
                  className="widget-remove absolute end-2 top-2 z-10 rounded-md bg-surface-sunken p-1 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label="Remove widget"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <WidgetRenderer item={item} data={data} />
            </div>
          ))}
        </GridLayout>
        )}
      </div>
    </div>
  );
}
