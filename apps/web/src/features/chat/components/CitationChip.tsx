"use client";

import * as React from "react";
import type { RepoGraph, GraphNode } from "@/types/graph";
import { cn } from "@/lib/utils";

export interface CitationChipProps {
  nodeId: string;
  fallbackLabel?: string;
  graph: RepoGraph;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export function CitationChip({
  nodeId,
  fallbackLabel,
  graph,
  onSelectNode,
  className,
}: CitationChipProps) {
  const node: GraphNode | undefined = React.useMemo(() => {
    return graph.nodes.find((n) => n.id === nodeId);
  }, [graph.nodes, nodeId]);

  const cluster = React.useMemo(() => {
    if (!node) return undefined;
    return graph.clusters.find(
      (c) =>
        c.name.toLowerCase() === node.cluster.toLowerCase() ||
        c.id === node.cluster
    );
  }, [graph.clusters, node]);

  if (!node) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded bg-surface-elevated text-xs font-mono text-text-muted border border-border-subtle",
          className
        )}
      >
        {fallbackLabel ?? nodeId}
      </span>
    );
  }

  const clusterColor = cluster?.color ?? node.color ?? "#3b82f6";

  return (
    <button
      type="button"
      onClick={() => onSelectNode?.(node.id)}
      title={`Focus ${node.path} (${node.loc} LOC, ${node.cluster})`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 mx-1 rounded bg-surface-elevated hover:bg-surface-hover border border-border-subtle hover:border-accent text-xs font-mono text-text-primary transition-all cursor-pointer align-baseline group shadow-sm select-none",
        className
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
        style={{ backgroundColor: clusterColor }}
      />
      <span className="group-hover:text-accent font-medium truncate max-w-[200px]">
        {node.label}
      </span>
      <span className="text-[10px] text-text-muted group-hover:text-text-secondary">
        {node.loc}L
      </span>
      <svg
        className="w-3 h-3 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
