"use client";

import { useEffect, useState } from "react";
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
import { MoreVertical } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Chip, type ChipProps } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { moveDealAction } from "../actions";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/components/layout/session-context";
import { useTranslations } from "next-intl";

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

/** Every stage in the pipeline (including Won/Lost) — options for the per-card "move to" menu. */
export interface KanbanStageOption {
  stageId: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function DealCard({
  deal,
  currentStageId,
  allStages,
  onMove,
}: {
  deal: KanbanDeal;
  currentStageId: string;
  allStages: KanbanStageOption[];
  onMove: (dealId: string, stageId: string) => void;
}) {
  const t = useTranslations("deals");
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
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">{deal.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              // Stop the pointerdown before dnd-kit's drag listener (on the
              // card root) sees it, so tapping this button never starts a drag.
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t("optionsLabel")}
              className="-m-1 shrink-0 rounded p-1 text-ink-faint outline-none hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
            <div className="px-2.5 py-1 text-xs text-ink-faint">{t("moveToLabel")}</div>
            {allStages.map((s) => (
              <DropdownMenuItem
                key={s.stageId}
                disabled={s.stageId === currentStageId}
                onSelect={() => onMove(deal.id, s.stageId)}
              >
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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

function Column({
  column,
  allStages,
  onMove,
}: {
  column: KanbanColumn;
  allStages: KanbanStageOption[];
  onMove: (dealId: string, stageId: string) => void;
}) {
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
          <DealCard
            key={deal.id}
            deal={deal}
            currentStageId={column.stageId}
            allStages={allStages}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  columns: initial,
  allStages,
}: {
  columns: KanbanColumn[];
  allStages: KanbanStageOption[];
}) {
  const demoMode = useDemoMode();
  const tShell = useTranslations("shell");
  const [columns, setColumns] = useState(initial);
  const [activeDeal, setActiveDeal] = useState<KanbanDeal | null>(null);
  const [simulated, setSimulated] = useState(false);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!demoMode) return;
    function addLocalDeal(event: Event) {
      const deal = (event as CustomEvent<KanbanDeal>).detail;
      setColumns((current) =>
        current.map((column, index) =>
          index === 0
            ? {
                ...column,
                total: column.total + deal.value,
                deals: [deal, ...column.deals],
              }
            : column,
        ),
      );
      setSimulated(true);
    }
    window.addEventListener("sobi:demo-deal-created", addLocalDeal);
    return () => window.removeEventListener("sobi:demo-deal-created", addLocalDeal);
  }, [demoMode]);

  /** Move a deal to a target stage — shared by drag-drop and the per-card menu. */
  function moveDeal(dealId: string, targetStageId: string) {
    const sourceCol = columns.find((c) => c.deals.some((d) => d.id === dealId));
    if (!sourceCol || sourceCol.stageId === targetStageId) return;
    const deal = sourceCol.deals.find((d) => d.id === dealId)!;

    // Leaving the active board entirely (moved to a terminal Won/Lost stage
    // not present among the visible columns).
    const targetCol = columns.find((c) => c.stageId === targetStageId);

    setColumns((cols) =>
      cols.map((c) => {
        if (c.stageId === sourceCol.stageId) {
          return {
            ...c,
            total: c.total - deal.value,
            deals: c.deals.filter((d) => d.id !== dealId),
          };
        }
        if (targetCol && c.stageId === targetStageId) {
          return { ...c, total: c.total + deal.value, deals: [deal, ...c.deals] };
        }
        return c;
      }),
    );

    if (demoMode) {
      setSimulated(true);
      return;
    }
    void moveDealAction(dealId, targetStageId).then(() => router.refresh());
  }

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
    moveDeal(dealId, targetStageId);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {simulated && (
        <p role="status" className="px-6 pt-3 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
      <div className="flex gap-4 overflow-x-auto px-4 py-4 sm:px-6">
        {columns.map((column) => (
          <Column key={column.stageId} column={column} allStages={allStages} onMove={moveDeal} />
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
