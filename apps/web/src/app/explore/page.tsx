"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Panel, PanelHeader, PanelContent } from "@/components/Panel";
import { GraphBoundary } from "@/features/graph/components/GraphBoundary";
import { GraphLoadingState } from "@/features/graph/components/GraphLoadingState";
import { GraphErrorState } from "@/features/graph/components/GraphErrorState";
import { GraphEmptyState } from "@/features/graph/components/GraphEmptyState";
import { ShortcutsModal } from "@/features/graph/components/ShortcutsModal";
import { DetailsPanel } from "@/features/graph/components/DetailsPanel";
import { SearchFilterBar } from "@/features/graph/components/SearchFilterBar";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { ImpactPanel } from "@/features/impact/components/ImpactPanel";
import { ColorModeSelector } from "@/features/graph/components/ColorModeSelector";
import { useGraphKeyboardShortcuts } from "@/features/graph/hooks/useGraphKeyboardShortcuts";
import { computeMatchingNodeIds } from "@/features/graph/lib/graphFilters";
import { useGraphStore } from "@/store/useGraphStore";
import { getGraph } from "@/lib/api";
import type { RepoGraph, GraphNode } from "@/types/graph";
import type Sigma from "sigma";

// Sigma reads WebGL globals on import, so even its module must stay in the browser.
const GraphCanvas = dynamic(
  () => import("@/features/graph/components/GraphCanvas").then((module) => module.GraphCanvas),
  { ssr: false, loading: () => <GraphLoadingState /> }
);

function ExploreContent() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "torvalds/linux";

  const [graph, setGraph] = React.useState<RepoGraph | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [inputUrl, setInputUrl] = React.useState(repoParam);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  const sigmaRef = React.useRef<Sigma | null>(null);
  const focusSearch = React.useCallback(() => {
    const search = document.getElementById("graph-search") as HTMLInputElement | null;
    if (!search) return;
    if (search.getClientRects().length === 0) {
      document.querySelector<HTMLButtonElement>('[aria-controls="workspace-sidebar"]')?.click();
    }
    requestAnimationFrame(() => {
      search.focus();
      search.select();
    });
  }, []);

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

  // retryCount increments each time the user clicks Retry.
  // The fetch useEffect depends on [repoParam, retryCount] so it re-runs on retry
  // without calling setState inside the effect body itself (satisfies react-hooks/set-state-in-effect).
  const [retryCount, setRetryCount] = React.useState(0);
  const handleRetry = React.useCallback(() => setRetryCount((c) => c + 1), []);

  React.useEffect(() => {
    // Reset the previous request before starting a new mock load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setGraph(null);

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
  }, [repoParam, retryCount]);

  // Escape key priority: exit impact > deselect > close chat
  const handleEscape = React.useCallback(() => {
    if (impactTargetId) {
      clearImpactMode();
    } else if (selectedNodeId) {
      clearSelection();
    } else if (isChatOpen) {
      setIsChatOpen(false);
    }
  }, [impactTargetId, selectedNodeId, isChatOpen, clearImpactMode, clearSelection]);

  const handleToggleShortcuts = React.useCallback(() => {
    setShowShortcuts((prev) => !prev);
  }, []);

  // Wire all keyboard shortcuts
  useGraphKeyboardShortcuts({
    sigmaRef,
    onFocusSearch: focusSearch,
    onToggleShortcuts: handleToggleShortcuts,
    onEscape: handleEscape,
  });

  // Derived: match set is a pure function of nodes + filters
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

  const selectedNode: GraphNode | undefined = React.useMemo(() => {
    if (!graph || !selectedNodeId) return undefined;
    return graph.nodes.find((n) => n.id === selectedNodeId);
  }, [graph, selectedNodeId]);

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

  // Determine what to show in the main canvas area
  const canvasContent = (() => {
    if (isLoading) return <GraphLoadingState />;
    if (error) return <GraphErrorState message={error} onRetry={handleRetry} />;
    if (!graph || graph.nodes.length === 0) return <GraphEmptyState />;
    return (
      <>
        <GraphBoundary key={retryCount} onRetry={handleRetry}>
          <GraphCanvas data={graph} sigmaRef={sigmaRef} />
        </GraphBoundary>

        <div className="atlas-map-stamp">
          <span>REPOSITORY SURVEY / MOCK DATA</span>
          <strong>
            {graph.repo.owner}/{graph.repo.name}
          </strong>
          <span>
            {graph.nodes.length} FILES · {graph.clusters.length} TERRITORIES
          </span>
        </div>

        {/* Floating Color Mode Selector & Adaptive Legend */}
        <div className="absolute top-4 right-4 z-20">
          <ColorModeSelector graph={graph} />
        </div>

        {/* Floating Chat Panel & Toggle Button */}
        <div className="absolute bottom-4 left-3 right-3 sm:right-auto z-30">
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

        {/* ? shortcut hint */}
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          title="Keyboard shortcuts (?)"
          className="absolute top-16 right-4 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-surface-panel/90 border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-elevated text-xs font-mono transition-colors cursor-pointer shadow"
        >
          ?
        </button>
      </>
    );
  })();

  return (
    <>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <AppShell
        header={
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="atlas-wordmark text-text-primary hover:text-accent transition-colors"
              >
                RepoAtlas
              </Link>
              <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono text-accent border border-border-subtle">
                {graph ? `${graph.stats.totalFiles} nodes` : isLoading ? "Loading…" : "—"}
              </span>
            </div>

            <div className="hidden sm:block flex-1 min-w-0 max-w-md">
              <Input
                aria-label="Repository URL"
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
                      <span className="font-mono text-text-primary">{graph.stats.totalFiles}</span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Dependency Edges</span>
                      <span className="font-mono text-text-primary">{graph.edges.length}</span>
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
          {canvasContent}
        </div>
      </AppShell>
    </>
  );
}

export default function ExplorePage() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen bg-surface-base" />}>
      <ExploreContent />
    </React.Suspense>
  );
}
