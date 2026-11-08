"use client";

import * as React from "react";
import type { RepoGraph, GraphNode } from "@/types/graph";
import { computeBlastRadius, DEPTH_COLORS } from "../lib/impactAnalysis";
import { useGraphStore } from "@/store/useGraphStore";
import { cn } from "@/lib/utils";

export interface ImpactPanelProps {
  graph: RepoGraph;
  targetNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
  className?: string;
}

export function ImpactPanel({
  graph,
  targetNodeId,
  onSelectNode,
  onClose,
  className,
}: ImpactPanelProps) {
  const impactDepth = useGraphStore((s) => s.impactDepth);
  const setImpactDepth = useGraphStore((s) => s.setImpactDepth);
  const setImpactedNodes = useGraphStore((s) => s.setImpactedNodes);

  const [activeTab, setActiveTab] = React.useState<number>(1);

  // Compute blast radius when target or depth changes
  const blastRadius = React.useMemo(() => {
    return computeBlastRadius(graph, targetNodeId, impactDepth);
  }, [graph, targetNodeId, impactDepth]);

  // Sync the depth map to the zustand store so the canvas reducers can recolor nodes
  React.useEffect(() => {
    if (blastRadius) {
      setImpactedNodes(blastRadius.depthMap);
    }
  }, [blastRadius, setImpactedNodes]);

  if (!blastRadius) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-text-muted">
        Target node not found in graph.
      </div>
    );
  }

  const { targetNode, totalAffectedFiles, totalAffectedLoc, byDepth } = blastRadius;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-surface-panel text-text-primary select-none overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border-subtle bg-surface-panel space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>Blast Radius Mode</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border-subtle transition-colors cursor-pointer"
            title="Exit impact mode (Esc)"
          >
            <span>Exit</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <h2 className="text-base font-semibold text-text-primary truncate font-mono">
            {targetNode.label}
          </h2>
          <p className="text-xs text-text-muted font-mono truncate mt-0.5">
            {targetNode.path}
          </p>
        </div>

        {/* Depth Control (1 to 3 hops) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-medium text-text-muted uppercase">
              Traversal Depth
            </span>
            <span className="text-xs font-mono font-semibold text-accent">
              {impactDepth} {impactDepth === 1 ? "hop" : "hops"}
            </span>
          </div>
          <div className="flex rounded-lg bg-surface-elevated p-1 border border-border-subtle">
            {[1, 2, 3].map((depth) => (
              <button
                type="button"
                key={depth}
                onClick={() => {
                  setImpactDepth(depth);
                  setActiveTab(depth);
                }}
                className={cn(
                  "flex-1 py-1 text-xs font-medium rounded transition-all cursor-pointer text-center",
                  impactDepth === depth
                    ? "bg-accent text-white shadow-sm font-semibold"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {depth} {depth === 1 ? "Hop" : "Hops"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics & Affected Lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Affected Files
            </span>
            <p className="text-xl font-bold font-mono text-rose-400 mt-1">
              {totalAffectedFiles}
            </p>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Cumulative LOC
            </span>
            <p className="text-xl font-bold font-mono text-text-primary mt-1">
              {(totalAffectedLoc / 1000).toFixed(1)}k
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-lg border border-border-subtle bg-surface-elevated/60 p-2.5 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
            Canvas Color Legend
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPTH_COLORS[0] }} />
              <span className="text-text-secondary">Epicenter</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPTH_COLORS[1] }} />
              <span className="text-text-secondary">Direct (1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPTH_COLORS[2] }} />
              <span className="text-text-secondary">Indirect (2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPTH_COLORS[3] }} />
              <span className="text-text-secondary">Transitive (3)</span>
            </div>
          </div>
        </div>

        {/* Depth Breakdown Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider">
              Dependents by Hop
            </span>
            <div className="flex gap-1 text-[11px]">
              {[1, 2, 3].slice(0, impactDepth).map((depth) => (
                <button
                  type="button"
                  key={depth}
                  onClick={() => setActiveTab(depth)}
                  className={cn(
                    "px-2 py-0.5 rounded cursor-pointer font-mono transition-colors",
                    activeTab === depth
                      ? "bg-surface-elevated text-text-primary font-bold border border-border-subtle"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  D{depth} ({byDepth[depth]?.length ?? 0})
                </button>
              ))}
            </div>
          </div>

          {/* List of files at activeTab depth */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {(byDepth[activeTab] ?? []).length > 0 ? (
              byDepth[activeTab].map(({ node: depNode }) => (
                <button
                  type="button"
                  key={depNode.id}
                  onClick={() => onSelectNode(depNode.id)}
                  className="w-full flex items-center justify-between p-2 rounded bg-surface-elevated border border-border-subtle hover:border-accent hover:bg-surface-hover text-left text-xs transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: DEPTH_COLORS[activeTab as keyof typeof DEPTH_COLORS] }}
                      />
                      <p className="font-mono text-text-primary font-medium truncate group-hover:text-accent transition-colors">
                        {depNode.label}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted truncate mt-0.5 pl-3">
                      {depNode.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-text-muted">
                      {depNode.loc}L
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-6 text-center rounded border border-dashed border-border-subtle bg-surface-elevated/40">
                <p className="text-xs text-text-muted font-mono">
                  No upstream dependents found at depth {activeTab}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
