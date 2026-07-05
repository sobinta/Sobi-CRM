"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphNode, GraphEdge } from "@/engines/graph/graph-service";

/**
 * Relationship Graph view. Lays out the connection graph with a simple typed
 * column layout (companies, contacts, deals) and renders it with React Flow —
 * pan, zoom, and select. Node color encodes entity type.
 */

const typeStyle: Record<string, { bg: string; col: number }> = {
  company: { bg: "var(--brand)", col: 0 },
  contact: { bg: "var(--accent)", col: 1 },
  deal: { bg: "var(--positive)", col: 2 },
};

export function GraphView({
  nodes: rawNodes,
  edges: rawEdges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const { nodes, edges } = useMemo(() => {
    // Column layout by type; stack within each column.
    const perCol: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    const nodes: Node[] = rawNodes.map((n) => {
      const style = typeStyle[n.type];
      const y = perCol[style.col] * 64;
      perCol[style.col] += 1;
      return {
        id: n.id,
        position: { x: style.col * 260, y },
        data: { label: n.label },
        style: {
          background: style.bg,
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          padding: "6px 10px",
          width: 200,
        },
      };
    });
    const edges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
      style: { stroke: "var(--line-strong)" },
      labelStyle: { fill: "var(--ink-faint)", fontSize: 10 },
    }));
    return { nodes, edges };
  }, [rawNodes, rawEdges]);

  return (
    <div className="h-[calc(100dvh-8rem)] rounded-xl border border-line bg-surface-sunken/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
      >
        <Background color="var(--line)" gap={20} />
        <Controls className="!bg-surface-raised !border-line" />
      </ReactFlow>
    </div>
  );
}
