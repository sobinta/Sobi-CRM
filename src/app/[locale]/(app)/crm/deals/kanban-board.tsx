"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "@/i18n/navigation";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { moveDealAction } from "../actions";
import { cn } from "@/lib/utils";

export interface KanbanDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  contactName?: string;
  companyName?: string;
}

export interface KanbanColumn {
  stageId: string;
  name: string;
  tone: ChipProps["tone"];
  total: number;
  deals: KanbanDeal[];
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function DealCard({ deal }: { deal: KanbanDeal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border border-line bg-surface-raised p-3 shadow-raised active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p className="text-sm font-medium text-ink">{deal.title}</p>
      <p className="mt-1 tabular text-sm font-semibold text-brand">
        {formatMoney(deal.value, deal.currency)}
      </p>
      {(deal.contactName || deal.companyName) && (
        <p className="mt-1 truncate text-xs text-ink-muted">
          {deal.companyName ?? deal.contactName}
        </p>
      )}
    </div>
  );
}

function Column({ column }: { column: KanbanColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stageId });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Chip tone={column.tone}>{column.name}</Chip>
          <span className="text-xs text-ink-faint">{column.deals.length}</span>
        </div>
        <span className="tabular text-xs font-medium text-ink-muted">
          {formatMoney(column.total, column.deals[0]?.currency ?? "EUR")}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver ? "border-brand bg-brand-subtle/40" : "border-line bg-surface-sunken/30",
        )}
      >
        {column.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ columns: initial }: { columns: KanbanColumn[] }) {
  const [columns, setColumns] = useState(initial);
  const [activeDeal, setActiveDeal] = useState<KanbanDeal | null>(null);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragStart(e: DragStartEvent) {
    for (const col of columns) {
      const deal = col.deals.find((d) => d.id === e.active.id);
      if (deal) {
        setActiveDeal(deal);
        return;
      }
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    const dealId = String(e.active.id);
    const targetStageId = e.over ? String(e.over.id) : null;
    if (!targetStageId) return;

    // Find source column.
    const sourceCol = columns.find((c) =>
      c.deals.some((d) => d.id === dealId),
    );
    if (!sourceCol || sourceCol.stageId === targetStageId) return;

    // Optimistic move.
    const deal = sourceCol.deals.find((d) => d.id === dealId)!;
    setColumns((cols) =>
      cols.map((c) => {
        if (c.stageId === sourceCol.stageId)
          return { ...c, deals: c.deals.filter((d) => d.id !== dealId) };
        if (c.stageId === targetStageId)
          return { ...c, deals: [deal, ...c.deals] };
        return c;
      }),
    );

    void moveDealAction(dealId, targetStageId).then(() => router.refresh());
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto px-6 py-4">
        {columns.map((column) => (
          <Column key={column.stageId} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && (
          <div className="w-64 rotate-2 rounded-lg border border-brand bg-surface-raised p-3 shadow-overlay">
            <p className="text-sm font-medium text-ink">{activeDeal.title}</p>
            <p className="mt-1 tabular text-sm font-semibold text-brand">
              {formatMoney(activeDeal.value, activeDeal.currency)}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
