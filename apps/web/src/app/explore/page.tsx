"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Panel, PanelHeader, PanelContent } from "@/components/Panel";
import { GraphCanvas } from "@/features/graph/components/GraphCanvas";
import { DetailsPanel } from "@/features/graph/components/DetailsPanel";
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

  // Press Escape to deselect
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedNodeId) {
        clearSelection();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, clearSelection]);

  // Find currently selected node metadata
  const selectedNode: GraphNode | undefined = React.useMemo(() => {
    if (!graph || !selectedNodeId) return undefined;
    return graph.nodes.find((n) => n.id === selectedNodeId);
  }, [graph, selectedNodeId]);

  // Handler for clicking a neighbor inside DetailsPanel
  const handleSelectNode = React.useCallback(
    (nodeId: string) => {
      if (!graph) return;
      const neighbors = graph.edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => (e.source === nodeId ? e.target : e.source));
      setSelectedNodeId(nodeId, neighbors);
    },
    [graph, setSelectedNodeId]
  );

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
        selectedNode && graph ? (
          <DetailsPanel
            key={selectedNode.id}
            node={selectedNode}
            graph={graph}
            onClose={clearSelection}
            onSelectNode={handleSelectNode}
          />
        ) : (
          <Panel className="h-full rounded-none border-none">
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
          </Panel>
        )
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
