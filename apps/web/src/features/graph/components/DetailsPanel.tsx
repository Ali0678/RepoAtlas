"use client";

import * as React from "react";
import type { GraphNode, RepoGraph, SymbolKind } from "@/types/graph";
import { cn } from "@/lib/utils";

export interface DetailsPanelProps {
  node: GraphNode;
  graph: RepoGraph;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  className?: string;
}

function getComplexityStatus(complexity: number) {
  if (complexity <= 10) {
    return {
      label: "Low",
      colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    };
  }
  if (complexity <= 25) {
    return {
      label: "Moderate",
      colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    };
  }
  return {
    label: "High",
    colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
}

function getSymbolKindBadge(kind: SymbolKind) {
  switch (kind) {
    case "function":
      return {
        label: "fn",
        className: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      };
    case "class":
      return {
        label: "class",
        className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      };
    case "interface":
      return {
        label: "iface",
        className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      };
    case "method":
      return {
        label: "meth",
        className: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      };
    case "type":
      return {
        label: "type",
        className: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      };
    case "variable":
      return {
        label: "var",
        className: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
      };
    default:
      return {
        label: kind,
        className: "text-text-muted bg-surface-elevated border-border-subtle",
      };
  }
}

export function DetailsPanel({
  node,
  graph,
  onClose,
  onSelectNode,
  className,
}: DetailsPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"imports" | "importedBy">("imports");
  const [dependencyQuery, setDependencyQuery] = React.useState("");
  const [symbolQuery, setSymbolQuery] = React.useState("");



  // Cluster information & resolved accent color
  const cluster = React.useMemo(() => {
    return graph.clusters.find(
      (c) =>
        c.name.toLowerCase() === node.cluster.toLowerCase() ||
        c.id === node.cluster
    );
  }, [graph.clusters, node.cluster]);

  const clusterColor = cluster?.color ?? node.color ?? "#3b82f6";

  // Outbound dependencies: modules imported by this node (edge.source === node.id)
  const importsNodes = React.useMemo(() => {
    const nodeLookup = new Map(graph.nodes.map((n) => [n.id, n]));
    const targetMap = new Map<string, number>();

    for (const edge of graph.edges) {
      if (edge.source === node.id) {
        targetMap.set(edge.target, edge.weight);
      }
    }

    const list: { node: GraphNode; weight: number }[] = [];
    for (const [targetId, weight] of targetMap.entries()) {
      const targetNode = nodeLookup.get(targetId);
      if (targetNode) list.push({ node: targetNode, weight });
    }

    return list.sort((a, b) => b.weight - a.weight || a.node.label.localeCompare(b.node.label));
  }, [graph, node.id]);

  // Inbound dependents: modules that import this node (edge.target === node.id)
  const importedByNodes = React.useMemo(() => {
    const nodeLookup = new Map(graph.nodes.map((n) => [n.id, n]));
    const sourceMap = new Map<string, number>();

    for (const edge of graph.edges) {
      if (edge.target === node.id) {
        sourceMap.set(edge.source, edge.weight);
      }
    }

    const list: { node: GraphNode; weight: number }[] = [];
    for (const [sourceId, weight] of sourceMap.entries()) {
      const sourceNode = nodeLookup.get(sourceId);
      if (sourceNode) list.push({ node: sourceNode, weight });
    }

    return list.sort((a, b) => b.weight - a.weight || a.node.label.localeCompare(b.node.label));
  }, [graph, node.id]);

  const handleCopyPath = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(node.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [node.path]);

  const complexityStatus = getComplexityStatus(node.complexity);

  // Filtered dependency list
  const currentDependencyList = activeTab === "imports" ? importsNodes : importedByNodes;
  const filteredDependencies = React.useMemo(() => {
    if (!dependencyQuery.trim()) return currentDependencyList;
    const q = dependencyQuery.toLowerCase();
    return currentDependencyList.filter(
      (item) =>
        item.node.label.toLowerCase().includes(q) ||
        item.node.path.toLowerCase().includes(q)
    );
  }, [currentDependencyList, dependencyQuery]);

  // Filtered symbols list
  const filteredSymbols = React.useMemo(() => {
    if (!symbolQuery.trim()) return node.symbols;
    const q = symbolQuery.toLowerCase();
    return node.symbols.filter(
      (sym) =>
        sym.name.toLowerCase().includes(q) ||
        sym.kind.toLowerCase().includes(q) ||
        (sym.signature && sym.signature.toLowerCase().includes(q))
    );
  }, [node.symbols, symbolQuery]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-panel text-text-primary select-none overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border-subtle bg-surface-panel space-y-3">
        <div className="flex items-center justify-between gap-2">
          {/* Cluster Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-medium text-text-secondary">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: clusterColor }}
            />
            <span className="capitalize">{node.cluster}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Copy Path Button */}
            <button
              type="button"
              onClick={handleCopyPath}
              title={copied ? "Path copied!" : "Copy file path"}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer",
                copied
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border-subtle"
              )}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close details (Esc)"
              className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-text-primary truncate font-mono">
            {node.label}
          </h2>
          <p
            className="text-xs text-text-muted font-mono truncate mt-0.5"
            title={node.path}
          >
            {node.path}
          </p>
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Metric Tiles (4-grid) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tile 1: Lines of Code */}
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Lines of Code
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {node.loc.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-panel border border-border-subtle text-text-muted uppercase">
                {node.language}
              </span>
            </div>
          </div>

          {/* Tile 2: Cyclomatic Complexity */}
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Complexity
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {node.complexity}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  complexityStatus.colorClass
                )}
              >
                {complexityStatus.label}
              </span>
            </div>
          </div>

          {/* Tile 3: Inbound (Imported By) */}
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Imported By
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {importedByNodes.length}
              </span>
              <span className="text-[10px] font-mono text-text-muted">in-degree</span>
            </div>
          </div>

          {/* Tile 4: Outbound (Imports) */}
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Imports
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {importsNodes.length}
              </span>
              <span className="text-[10px] font-mono text-text-muted">out-degree</span>
            </div>
          </div>
        </div>

        {/* Segmented Tabs: Dependencies */}
        <div className="space-y-2.5">
          <div className="flex rounded-lg bg-surface-elevated p-1 border border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveTab("imports")}
              className={cn(
                "flex-1 py-1 px-2 text-xs font-medium rounded transition-all cursor-pointer text-center",
                activeTab === "imports"
                  ? "bg-surface-hover text-text-primary shadow-sm font-semibold"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              Imports ({importsNodes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("importedBy")}
              className={cn(
                "flex-1 py-1 px-2 text-xs font-medium rounded transition-all cursor-pointer text-center",
                activeTab === "importedBy"
                  ? "bg-surface-hover text-text-primary shadow-sm font-semibold"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              Imported By ({importedByNodes.length})
            </button>
          </div>

          {/* Filter input for dependencies if list has more than 5 items */}
          {currentDependencyList.length > 5 ? (
            <input
              type="text"
              value={dependencyQuery}
              onChange={(e) => setDependencyQuery(e.target.value)}
              placeholder={`Filter ${activeTab === "imports" ? "imports" : "dependents"}...`}
              className="w-full px-2.5 py-1 text-xs rounded bg-surface-elevated border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          ) : null}

          {/* Dependencies List */}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {filteredDependencies.length > 0 ? (
              filteredDependencies.map(({ node: depNode, weight }) => (
                <button
                  type="button"
                  key={depNode.id}
                  onClick={() => onSelectNode(depNode.id)}
                  className="w-full flex items-center justify-between p-2 rounded bg-surface-elevated border border-border-subtle hover:border-accent hover:bg-surface-hover text-left text-xs transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono text-text-primary font-medium truncate group-hover:text-accent transition-colors">
                      {depNode.label}
                    </p>
                    <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                      {depNode.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {weight > 1 ? (
                      <span className="text-[10px] font-mono text-text-muted px-1 rounded bg-surface-panel border border-border-subtle">
                        x{weight}
                      </span>
                    ) : null}
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
                  {currentDependencyList.length === 0
                    ? activeTab === "imports"
                      ? "No outbound imports (leaf module)"
                      : "No inbound dependents (entry point)"
                    : "No matching dependencies found"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Exported Symbols Section */}
        <div className="space-y-2 pt-2 border-t border-border-subtle/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider">
              Exported Symbols ({node.symbols.length})
            </span>
          </div>

          {/* Filter input for symbols if list has more than 5 symbols */}
          {node.symbols.length > 5 ? (
            <input
              type="text"
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value)}
              placeholder="Filter symbols..."
              className="w-full px-2.5 py-1 text-xs rounded bg-surface-elevated border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          ) : null}

          {/* Symbols List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredSymbols.length > 0 ? (
              filteredSymbols.map((sym) => {
                const badge = getSymbolKindBadge(sym.kind);
                return (
                  <div
                    key={sym.id}
                    className="p-2 rounded bg-surface-elevated border border-border-subtle/80 hover:border-border-focus transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border uppercase shrink-0",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs font-mono font-medium text-text-primary truncate">
                          {sym.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        L{sym.startLine}–L{sym.endLine}
                      </span>
                    </div>

                    {sym.signature ? (
                      <p className="mt-1 text-[11px] font-mono text-text-muted truncate bg-surface-panel/70 px-1.5 py-0.5 rounded border border-border-subtle/40">
                        {sym.signature}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="py-5 text-center rounded border border-dashed border-border-subtle bg-surface-elevated/40">
                <p className="text-xs text-text-muted font-mono">
                  {node.symbols.length === 0
                    ? "No exported symbols indexed"
                    : "No matching symbols found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
