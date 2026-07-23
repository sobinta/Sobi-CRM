"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type EdgeChange,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Building2, User, Handshake, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/components/layout/session-context";
import type { GraphNode, GraphEdge, GraphNodeType } from "@/engines/graph/graph-service";
import { createRelationshipAction, deleteRelationshipAction } from "./actions";

/**
 * Relationship canvas. Records are draggable blocks laid out as a left-to-right
 * tree (company → its people → their deals), colour-coded by type. Click a block
 * to focus its connections (everything else dims); drag blocks to rearrange;
 * drag from a block's edge to draw a new link — which persists as a real
 * Relationship row, so it's still there next visit. Pan, zoom, minimap, and
 * type filters make a busy account easy to read at a glance.
 */

const NODE_CONF: Record<GraphNodeType, { color: string; icon: LucideIcon }> = {
  company: { color: "var(--brand)", icon: Building2 },
  contact: { color: "var(--accent)", icon: User },
  deal: { color: "var(--positive)", icon: Handshake },
};

/** Canonical edge labels from the service, mapped to i18n keys under `graph.*`. */
const EDGE_LABEL_KEY: Record<string, string> = {
  "works at": "worksAt",
  with: "with",
  linked: "linked",
};

const COL_W = 300;
const ROW_H = 80;

interface RecordData extends Record<string, unknown> {
  type: GraphNodeType;
  label: string;
  companyName?: string;
  dealValue?: number;
  dealCurrency?: string;
  contactCount?: number;
  dealCount?: number;
  dimmed?: boolean;
}

interface EdgeData extends Record<string, unknown> {
  /** Present only for a manually-drawn link — enables delete-from-canvas. */
  relationshipId?: string;
}

/** A single record rendered as a block: type-coloured accent, icon, title, and a fact line. */
function RecordNode({ data, selected }: NodeProps) {
  const d = data as RecordData;
  const t = useTranslations("graph");
  const locale = useLocale();
  const conf = NODE_CONF[d.type];
  const Icon = conf.icon;

  let subtitle: string | undefined;
  if (d.type === "company") {
    subtitle = `${d.contactCount ?? 0} ${t("contacts")} · ${d.dealCount ?? 0} ${t("deals")}`;
  } else if (d.type === "contact") {
    subtitle = d.companyName;
  } else if (d.type === "deal" && d.dealValue) {
    try {
      subtitle = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: d.dealCurrency || "EUR",
        maximumFractionDigits: 0,
      }).format(d.dealValue);
    } catch {
      subtitle = String(d.dealValue);
    }
  }

  return (
    <div
      dir="auto"
      className={cn(
        "flex w-[210px] items-center gap-2.5 rounded-xl border border-line bg-surface-raised px-3 py-2 shadow-raised transition-[opacity,box-shadow] duration-(--motion-fast)",
        selected && "ring-2 ring-brand",
        d.dimmed && "opacity-25",
      )}
      style={{ borderInlineStartColor: conf.color, borderInlineStartWidth: 3 }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-surface-raised !bg-line-strong" />
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in oklab, ${conf.color} 15%, transparent)`, color: conf.color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink">{d.label}</div>
        {subtitle && <div className="truncate text-[11px] text-ink-muted">{subtitle}</div>}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-surface-raised !bg-line-strong" />
    </div>
  );
}

const nodeTypes = { record: RecordNode };

function parseNodeId(id: string): { type: string; id: string } | null {
  const i = id.indexOf(":");
  if (i < 0) return null;
  return { type: id.slice(0, i), id: id.slice(i + 1) };
}

/** Left-to-right tree layout: parents (companies) on the left, leaves (deals) on the right, each subtree clustered vertically. */
function layout(rawNodes: GraphNode[], rawEdges: GraphEdge[]) {
  const childrenMap = new Map<string, string[]>();
  const childSet = new Set<string>();
  for (const e of rawEdges) {
    // edge is child → parent; group children under their parent
    childrenMap.set(e.target, [...(childrenMap.get(e.target) ?? []), e.source]);
    childSet.add(e.source);
  }
  const byId = new Map(rawNodes.map((n) => [n.id, n]));
  const roots = rawNodes.filter((n) => !childSet.has(n.id));

  const pos = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  let leaf = 0;
  const place = (id: string, depth: number): number => {
    if (visited.has(id)) return pos.get(id)!.y;
    visited.add(id);
    const kids = (childrenMap.get(id) ?? []).filter((k) => byId.has(k) && !visited.has(k));
    let y: number;
    if (kids.length === 0) {
      y = leaf * ROW_H;
      leaf += 1;
    } else {
      const ys = kids.map((k) => place(k, depth + 1));
      y = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    pos.set(id, { x: depth * COL_W, y });
    return y;
  };
  roots.forEach((r) => place(r.id, 0));
  // Any leftovers (cycles / multi-parent) get their own row so nothing is lost.
  rawNodes.forEach((n) => {
    if (!visited.has(n.id)) {
      pos.set(n.id, { x: 0, y: leaf * ROW_H });
      leaf += 1;
    }
  });

  const nodes: Node[] = rawNodes.map((n) => ({
    id: n.id,
    type: "record",
    position: pos.get(n.id) ?? { x: 0, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      type: n.type,
      label: n.label,
      companyName: n.companyName,
      dealValue: n.dealValue,
      dealCurrency: n.dealCurrency,
      contactCount: n.contactCount,
      dealCount: n.dealCount,
    } satisfies RecordData,
  }));

  // Display parent → child (left → right) so the tree flows outward.
  const edges: Edge[] = rawEdges.map((e) => ({
    id: e.id,
    source: e.target,
    target: e.source,
    label: e.label,
    type: "smoothstep",
    data: { relationshipId: e.relationshipId } satisfies EdgeData,
  }));

  return { nodes, edges };
}

export function GraphView({ nodes: rawNodes, edges: rawEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const t = useTranslations("graph");
  const demo = useDemoMode();
  const initial = useMemo(() => layout(rawNodes, rawEdges), [rawNodes, rawEdges]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [focused, setFocused] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<GraphNodeType>>(
    () => new Set<GraphNodeType>(["company", "contact", "deal"]),
  );
  const [notice, setNotice] = useState<"demo" | "protected" | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((kind: "demo" | "protected") => {
    setNotice(kind);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const labelFor = useCallback((raw: string) => t(EDGE_LABEL_KEY[raw] ?? "linked"), [t]);

  const typeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, (n.data as RecordData).type])),
    [nodes],
  );

  const neighborhood = useMemo(() => {
    if (!focused) return null;
    const set = new Set<string>([focused]);
    for (const e of edges) {
      if (e.source === focused) set.add(e.target);
      if (e.target === focused) set.add(e.source);
    }
    return set;
  }, [focused, edges]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (demo) {
        showNotice("demo");
        return;
      }
      const from = parseNodeId(c.source);
      const to = parseNodeId(c.target);
      if (!from || !to) return;
      void createRelationshipAction({ fromType: from.type, fromId: from.id, toType: to.type, toId: to.id }).then(
        (res) => {
          if (!res.ok) return;
          const edge: Edge = {
            id: `rel:${res.id}`,
            source: c.source,
            target: c.target,
            type: "smoothstep",
            label: labelFor("linked"),
            data: { relationshipId: res.id } satisfies EdgeData,
          };
          setEdges((eds) => [...eds, edge]);
        },
      );
    },
    [demo, showNotice, labelFor, setEdges],
  );

  // Only manually-drawn links (those with a relationshipId) can be deleted —
  // every other edge mirrors a real foreign key elsewhere in the CRM, so
  // "deleting" it here wouldn't make sense. Deletions also persist server-side.
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const blockedIds = new Set<string>();
      for (const change of changes) {
        if (change.type !== "remove") continue;
        const edge = edges.find((e) => e.id === change.id);
        const relationshipId = (edge?.data as EdgeData | undefined)?.relationshipId;
        if (!relationshipId) {
          blockedIds.add(change.id);
          showNotice("protected");
          continue;
        }
        if (demo) {
          blockedIds.add(change.id);
          showNotice("demo");
          continue;
        }
        void deleteRelationshipAction(relationshipId);
      }
      onEdgesChange(blockedIds.size ? changes.filter((c) => !(c.type === "remove" && blockedIds.has(c.id))) : changes);
    },
    [edges, onEdgesChange, demo, showNotice],
  );

  const isHidden = useCallback(
    (id: string) => {
      const ty = typeById.get(id);
      return ty ? !visible.has(ty) : false;
    },
    [typeById, visible],
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        hidden: isHidden(n.id),
        data: { ...n.data, dimmed: neighborhood ? !neighborhood.has(n.id) : false },
      })),
    [nodes, isHidden, neighborhood],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const active = neighborhood ? neighborhood.has(e.source) && neighborhood.has(e.target) : false;
        const manual = !!(e.data as EdgeData | undefined)?.relationshipId;
        return {
          ...e,
          label: typeof e.label === "string" && EDGE_LABEL_KEY[e.label] ? labelFor(e.label) : e.label,
          hidden: isHidden(e.source) || isHidden(e.target),
          animated: active,
          style: {
            stroke: active ? "var(--brand)" : "var(--line-strong)",
            strokeWidth: active ? 2 : 1.5,
            strokeDasharray: manual ? "5 4" : undefined,
          },
          labelStyle: { fill: active ? "var(--brand)" : "var(--ink-faint)", fontSize: 11, fontWeight: 500 },
          labelBgStyle: { fill: "var(--surface-raised)" },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      }),
    [edges, neighborhood, isHidden, labelFor],
  );

  const toggleType = (ty: GraphNodeType) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(ty)) next.delete(ty);
      else next.add(ty);
      return next;
    });

  const legend: { type: GraphNodeType; label: string }[] = [
    { type: "company", label: t("companies") },
    { type: "contact", label: t("contacts") },
    { type: "deal", label: t("deals") },
  ];

  return (
    <div dir="ltr" className="relative h-[calc(100dvh-12rem)] min-h-[480px] overflow-hidden rounded-xl border border-line bg-surface-sunken/30">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => setFocused((cur) => (cur === n.id ? null : n.id))}
        onPaneClick={() => setFocused(null)}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--line)" gap={22} size={1.5} />
        <Controls className="!rounded-lg !border !border-line !bg-surface-raised !shadow-raised" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          className="!rounded-lg !border !border-line !bg-surface-raised"
          maskColor="color-mix(in oklab, var(--surface-sunken) 60%, transparent)"
          nodeColor={(n) => NODE_CONF[(n.data as RecordData).type]?.color ?? "var(--line-strong)"}
        />
        <Panel position="top-left">
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised/95 p-2.5 shadow-raised backdrop-blur-sm">
            <div className="flex flex-wrap gap-1.5">
              {legend.map(({ type, label }) => {
                const on = visible.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring",
                      on
                        ? "border-line bg-surface text-ink"
                        : "border-transparent bg-surface-sunken text-ink-faint line-through",
                    )}
                  >
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_CONF[type].color }} />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="max-w-[220px] text-[11px] leading-snug text-ink-faint">{t("dragHint")}</p>
          </div>
        </Panel>
      </ReactFlow>
      {notice && (
        <div
          role="status"
          dir="auto"
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface-raised px-3.5 py-2 text-xs font-medium text-brand shadow-raised"
        >
          {notice === "demo" ? t("demoSimulation") : t("cannotDeleteAuto")}
        </div>
      )}
    </div>
  );
}
