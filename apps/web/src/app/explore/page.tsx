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
import { SearchFilterBar } from "@/features/graph/components/SearchFilterBar";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { ImpactPanel } from "@/features/impact/components/ImpactPanel";
import { ColorModeSelector } from "@/features/graph/components/ColorModeSelector";
import { computeMatchingNodeIds } from "@/features/graph/lib/graphFilters";
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
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);

  const searchQuery = useGraphStore((s) => s.searchQuery);
  const clusterFilter = useGraphStore((s) => s.clusterFilter);
  const languageFilter = useGraphStore((s) => s.languageFilter);
  const setMatchingNodeIds = useGraphStore((s) => s.setMatchingNodeIds);

  const impactTargetId = useGraphStore((s) => s.impactTargetId);
  const setImpactTarget = useGraphStore((s) => s.setImpactTarget);
  const clearImpactMode = useGraphStore((s) => s.clearImpactMode);

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

  // Press Escape to exit impact mode, deselect, or close chat
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (impactTargetId) {
          clearImpactMode();
        } else if (selectedNodeId) {
          clearSelection();
        } else if (isChatOpen) {
          setIsChatOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, isChatOpen, impactTargetId, clearSelection, clearImpactMode]);

  // Derived state: the match set is a pure function of nodes + filters.
  const matchingNodeIds = React.useMemo(
    () =>
      computeMatchingNodeIds(graph?.nodes ?? [], {
        query: searchQuery,
        clusters: clusterFilter,
        languages: languageFilter,
      }),
    [graph, searchQuery, clusterFilter, languageFilter]
  );

  React.useEffect(() => {
    setMatchingNodeIds(matchingNodeIds);
  }, [matchingNodeIds, setMatchingNodeIds]);

  // Find currently selected node metadata
  const selectedNode: GraphNode | undefined = React.useMemo(() => {
    if (!graph || !selectedNodeId) return undefined;
    return graph.nodes.find((n) => n.id === selectedNodeId);
  }, [graph, selectedNodeId]);

  // Handler for selecting a node (from DetailsPanel, CitationChip, ImpactPanel, etc.)
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
            <Button
              variant={isChatOpen ? "primary" : "ghost"}
              size="sm"
              onClick={() => setIsChatOpen((prev) => !prev)}
              className="flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span>Ask AI</span>
            </Button>
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
        graph ? (
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <SearchFilterBar graph={graph} />
            {impactTargetId ? (
              <ImpactPanel
                key={impactTargetId}
                graph={graph}
                targetNodeId={impactTargetId}
                onSelectNode={handleSelectNode}
                onClose={clearImpactMode}
              />
            ) : selectedNode ? (
              <DetailsPanel
                key={selectedNode.id}
                node={selectedNode}
                graph={graph}
                onClose={clearSelection}
                onSelectNode={handleSelectNode}
                onAnalyzeImpact={(nodeId) => setImpactTarget(nodeId)}
              />
            ) : (
              <Panel className="min-h-0 flex-1 rounded-none border-none">
                <PanelHeader
                  title="Graph Topology"
                  subtitle={`${graph.repo.owner}/${graph.repo.name} @ ${graph.repo.commitSha.slice(0, 7)}`}
                />
                <PanelContent className="space-y-2">
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
                    <span>Symbols</span>
                    <span className="font-mono text-text-primary">
                      {graph.stats.totalSymbols}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Physics Engine</span>
                    <span className="font-mono text-accent text-[11px]">
                      ForceAtlas2 (Worker)
                    </span>
                  </div>
                </PanelContent>
              </Panel>
            )}
          </div>
        ) : null
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
          <>
            <GraphCanvas data={graph} />

            {/* Floating Color Mode Selector & Adaptive Legend */}
            <div className="absolute top-4 right-4 z-20">
              <ColorModeSelector graph={graph} />
            </div>

            {/* Floating Chat Panel & Toggle Button */}
            <div className="absolute bottom-5 left-5 z-30">
              {isChatOpen ? (
                <ChatPanel
                  graph={graph}
                  onSelectNode={handleSelectNode}
                  onClose={() => setIsChatOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-panel/95 hover:bg-surface-elevated border border-border-subtle hover:border-accent text-xs font-medium text-text-primary shadow-xl backdrop-blur transition-all cursor-pointer group"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/15 text-accent group-hover:scale-110 transition-transform">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </span>
                  <span>Ask RepoAtlas AI</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated border border-border-subtle text-accent">
                    mock
                  </span>
                </button>
              )}
            </div>
          </>
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
