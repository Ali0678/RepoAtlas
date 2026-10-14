"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Panel, PanelHeader, PanelContent } from "@/components/Panel";
import { getGraph } from "@/lib/api";
import type { RepoGraph } from "@/types/graph";

function ExploreContent() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "torvalds/linux";

  const [graph, setGraph] = React.useState<RepoGraph | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [inputUrl, setInputUrl] = React.useState(repoParam);

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
          <PanelHeader
            title="Repository Clusters"
            subtitle={graph ? `${graph.clusters.length} architectural clusters` : "Loading..."}
          />
          <PanelContent className="space-y-4">
            {graph?.clusters.map((cluster) => (
              <div
                key={cluster.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-surface-elevated text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="font-medium text-text-primary">{cluster.name}</span>
                </div>
                <span className="font-mono text-text-muted">{cluster.nodeCount} files</span>
              </div>
            ))}
          </PanelContent>
        </Panel>
      }
    >
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-muted">Loading graph dataset...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : graph ? (
          <div className="flex flex-col items-center max-w-md">
            <div className="rounded-full border border-border-subtle bg-surface-elevated p-4 mb-4 text-accent">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {repoParam.includes("/") ? repoParam : `${graph.repo.owner}/${graph.repo.name}`}
            </h2>
            <p className="text-xs font-mono text-text-muted mt-1">
              Commit: {graph.repo.commitSha.slice(0, 7)}
            </p>

            <div className="grid grid-cols-3 gap-3 w-full mt-6">
              <div className="rounded border border-border-subtle bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold text-text-primary">{graph.stats.totalFiles}</p>
                <p className="text-xs text-text-muted">Files</p>
              </div>
              <div className="rounded border border-border-subtle bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold text-text-primary">{graph.edges.length}</p>
                <p className="text-xs text-text-muted">Imports</p>
              </div>
              <div className="rounded border border-border-subtle bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold text-text-primary">
                  {(graph.stats.totalLoc / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-text-muted">LOC</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function ExplorePage() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen bg-surface-base" />}>
      <ExploreContent />
    </React.Suspense>
  );
}
