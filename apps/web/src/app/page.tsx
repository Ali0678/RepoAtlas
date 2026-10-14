"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Panel, PanelHeader, PanelContent, PanelFooter } from "@/components/Panel";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = React.useState("https://github.com/torvalds/linux");

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base tracking-tight text-text-primary">
              RepoAtlas
            </span>
            <span className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono text-text-muted border border-border-subtle">
              Phase 0
            </span>
          </div>

          <div className="flex-1 max-w-md">
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/owner/repository"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Docs</Button>
            <Button variant="primary" size="sm">Analyze</Button>
          </div>
        </div>
      }
      sidebar={
        <Panel className="h-full rounded-none border-none">
          <PanelHeader
            title="Design Foundation"
            subtitle="Theme tokens & base components"
          />
          <PanelContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">BUTTON VARIANTS</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="ghost" size="sm">Ghost</Button>
                <Button variant="danger" size="sm">Danger</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">INPUT WITH STATE</p>
              <Input label="Search Symbols" placeholder="e.g. handleRequest" />
              <div className="mt-2">
                <Input label="Validation Example" error="Repository not found" defaultValue="invalid-url" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">TYPOGRAPHY</p>
              <p className="text-xs text-text-muted">Inter UI font</p>
              <p className="font-mono text-xs text-accent mt-1">/src/core/parser.ts:42</p>
            </div>
          </PanelContent>
          <PanelFooter>
            <Button variant="secondary" size="sm">Reset</Button>
            <Button variant="primary" size="sm">Save</Button>
          </PanelFooter>
        </Panel>
      }
    >
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full border border-border-subtle bg-surface-elevated p-4 mb-4 text-accent">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">WebGL Graph Canvas</h2>
        <p className="text-sm text-text-muted max-w-sm mt-1">
          Interactive sigma.js dependency graph mounts here in Phase 1.
        </p>
      </div>
    </AppShell>
  );
}