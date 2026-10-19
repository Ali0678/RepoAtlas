"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Panel, PanelHeader, PanelContent } from "@/components/Panel";
import { GraphCanvas } from "@/features/graph/components/GraphCanvas";
import { useGraphStore } from "@/store/useGraphStore";
import { getGraph } from "@/lib/api";
import type { RepoGraph, GraphNode } from "@/types/graph";

function ExploreContent() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "torvalds/linux";

  const [graph, setGraph] = React.useState<RepoGraph | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [inputUrl, setInputUrl] = React.useState(repoParam);

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);

  React.useEffect(() => {
    let isMounted = true;

    getGraph(repoParam)
      .then((data) => {
        if (isMounted) {
          setGraph(data);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repoParam]);

  // Find currently selected node metadata
  const selectedNode: GraphNode | undefined = React.useMemo(() => {
    if (!graph || !selectedNodeId) return undefined;
    return graph.nodes.find((n) => n.id === selectedNodeId);
  }, [graph, selectedNodeId]);

  // Find connected neighbors of the selected node
  const neighborNodes: GraphNode[] = React.useMemo(() => {
    if (!graph || !selectedNodeId) return [];
    const connectedIds = new Set<string>();
    for (const e of graph.edges) {
      if (e.source === selectedNodeId) connectedIds.add(e.target);
      if (e.target === selectedNodeId) connectedIds.add(e.source);
    }
    return graph.nodes.filter((n) => connectedIds.has(n.id));
  }, [graph, selectedNodeId]);

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-bold text-base tracking-tight text-text-primary hover:text-accent transition-colors"
            >
              RepoAtlas
            </Link>
            <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono text-accent border border-border-subtle">
              {graph ? `${graph.stats.totalFiles} nodes` : "Loading..."}
            </span>
          </div>

          <div className="flex-1 max-w-md">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="github.com/owner/repository"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Gallery
              </Button>
            </Link>
            <Button variant="primary" size="sm" isLoading={isLoading}>
              Analyze
            </Button>
          </div>
        </div>
      }
      sidebar={
        <Panel className="h-full rounded-none border-none">
          {selectedNode ? (
            <>
              <PanelHeader
                title={selectedNode.label}
                subtitle={selectedNode.path}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs text-text-muted hover:text-white"
                  >
                    Clear
                  </Button>
                }
              />
              <PanelContent className="space-y-4">
                {/* Node Metadata Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border-subtle bg-surface-elevated p-2 text-center">
                    <p className="text-[10px] text-text-muted uppercase">LOC</p>
                    <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {selectedNode.loc}
                    </p>
                  </div>
                  <div className="rounded border border-border-subtle bg-surface-elevated p-2 text-center">
                    <p className="text-[10px] text-text-muted uppercase">Complexity</p>
                    <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {selectedNode.complexity}
                    </p>
                  </div>
                  <div className="rounded border border-border-subtle bg-surface-elevated p-2 text-center">
                    <p className="text-[10px] text-text-muted uppercase">Cluster</p>
                    <p className="text-xs font-semibold text-accent mt-1 capitalize truncate">
                      {selectedNode.cluster}
                    </p>
                  </div>
                </div>

                {/* Symbols in this file */}
                {selectedNode.symbols.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-mono font-medium text-text-muted uppercase mb-1.5">
                      Exported Symbols ({selectedNode.symbols.length})
                    </p>
                    <div className="space-y-1">
                      {selectedNode.symbols.map((sym) => (
                        <div
                          key={sym.id}
                          className="flex items-center justify-between p-1.5 rounded bg-surface-elevated border border-border-subtle/80 text-xs font-mono"
                        >
                          <span className="text-text-primary truncate">{sym.name}</span>
                          <span className="text-[10px] text-accent px-1.5 py-0.5 rounded bg-accent-subtle shrink-0">
                            {sym.kind}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Connected Neighbors */}
                <div>
                  <p className="text-[11px] font-mono font-medium text-text-muted uppercase mb-1.5">
                    Connected Dependencies ({neighborNodes.length})
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {neighborNodes.map((nbr) => (
                      <button
                        type="button"
                        key={nbr.id}
                        onClick={() => {
                          const nbrNeighbors = graph?.edges
                            .filter((e) => e.source === nbr.id || e.target === nbr.id)
                            .map((e) => (e.source === nbr.id ? e.target : e.source)) ?? [];
                          setSelectedNodeId(nbr.id, nbrNeighbors);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded bg-surface-elevated border border-border-subtle hover:border-accent text-left text-xs transition-colors cursor-pointer group"
                      >
                        <span className="font-mono text-text-secondary group-hover:text-text-primary truncate">
                          {nbr.label}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted shrink-0 ml-2">
                          {nbr.loc} LOC
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </PanelContent>
            </>
          ) : (
            <>
              <PanelHeader
                title="Repository Clusters"
                subtitle={
                  graph
                    ? `${graph.clusters.length} architectural clusters`
                    : "Loading..."
                }
              />
              <PanelContent className="space-y-3">
                {graph?.clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-surface-elevated text-xs transition-colors hover:border-border-focus"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="font-medium text-text-primary">
                        {cluster.name}
                      </span>
                    </div>
                    <span className="font-mono text-text-muted">
                      {cluster.nodeCount} files
                    </span>
                  </div>
                ))}

                {graph ? (
                  <div className="mt-6 pt-4 border-t border-border-subtle/80 space-y-2">
                    <p className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider">
                      Graph Topology
                    </p>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Total Files</span>
                      <span className="font-mono text-text-primary">
                        {graph.stats.totalFiles}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Dependency Edges</span>
                      <span className="font-mono text-text-primary">
                        {graph.edges.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Lines of Code</span>
                      <span className="font-mono text-text-primary">
                        {(graph.stats.totalLoc / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Physics Engine</span>
                      <span className="font-mono text-accent text-[11px]">
                        ForceAtlas2 (Worker)
                      </span>
                    </div>
                  </div>
                ) : null}
              </PanelContent>
            </>
          )}
        </Panel>
      }
    >
      <div className="relative h-full w-full overflow-hidden bg-surface-base">
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-muted">Initializing WebGL canvas...</p>
          </div>
        ) : error ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : graph ? (
          <GraphCanvas data={graph} />
        ) : null}
      </div>
    </AppShell>
  );
}

export default function ExplorePage() {
  return (
    <React.Suspense
      fallback={<div className="h-screen w-screen bg-surface-base" />}
    >
      <ExploreContent />
    </React.Suspense>
  );
}
