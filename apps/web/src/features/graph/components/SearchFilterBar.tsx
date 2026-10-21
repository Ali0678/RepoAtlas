"use client";

import * as React from "react";
import { Input } from "@/components/Input";
import { isFilterActive } from "@/features/graph/lib/graphFilters";
import { useGraphStore } from "@/store/useGraphStore";
import type { RepoGraph } from "@/types/graph";
import { cn } from "@/lib/utils";

export interface SearchFilterBarProps {
  graph: RepoGraph;
  className?: string;
}

export function SearchFilterBar({ graph, className }: SearchFilterBarProps) {
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const clusterFilter = useGraphStore((s) => s.clusterFilter);
  const toggleClusterFilter = useGraphStore((s) => s.toggleClusterFilter);
  const languageFilter = useGraphStore((s) => s.languageFilter);
  const toggleLanguageFilter = useGraphStore((s) => s.toggleLanguageFilter);
  const matchingNodeIds = useGraphStore((s) => s.matchingNodeIds);
  const clearFilters = useGraphStore((s) => s.clearFilters);

  const totalNodes = graph.nodes.length;
  const matchCount =
    matchingNodeIds === null ? totalNodes : matchingNodeIds.size;

  const filtersActive = isFilterActive({
    query: searchQuery,
    clusters: clusterFilter,
    languages: languageFilter,
  });

  const languageEntries = React.useMemo(
    () => Object.entries(graph.stats.languages).sort((a, b) => b[1] - a[1]),
    [graph.stats.languages]
  );

  return (
    <div
      className={cn(
        "shrink-0 space-y-3 border-b border-border-subtle bg-surface-panel p-4",
        className
      )}
    >
      {/* Controlled search input: the store is the single source of truth */}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by path or symbol..."
      />

      {/* Language chips: empty selection means "all languages" */}
      <div className="flex flex-wrap gap-1.5">
        {languageEntries.map(([language, count]) => {
          const active = languageFilter.has(language);
          return (
            <button
              key={language}
              type="button"
              onClick={() => toggleLanguageFilter(language)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-mono transition-colors cursor-pointer",
                active
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border-subtle bg-surface-elevated text-text-muted hover:border-border-focus hover:text-text-secondary"
              )}
            >
              {language} · {count}
            </button>
          );
        })}
      </div>

      {/* Cluster toggles (replaces the old static legend) */}
      <div className="space-y-1">
        <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-text-muted">
          Clusters
        </p>
        {graph.clusters.map((cluster) => {
          const active = clusterFilter.has(cluster.id);
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => toggleClusterFilter(cluster.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border p-2 text-xs transition-colors cursor-pointer",
                active
                  ? "border-accent bg-accent-subtle"
                  : "border-border-subtle bg-surface-elevated hover:border-border-focus"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                  style={{ backgroundColor: cluster.color }}
                />
                <span className="font-medium text-text-primary">
                  {cluster.name}
                </span>
              </div>
              <span className="font-mono text-text-muted">
                {cluster.nodeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live match counter and reset */}
      <div className="flex items-center justify-between border-t border-border-subtle/80 pt-2.5">
        <span className="font-mono text-[11px] text-text-muted">
          {matchCount} / {totalNodes} files
        </span>
        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-text-secondary transition-colors hover:text-accent cursor-pointer"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
