"use client";

import * as React from "react";
import type { RepoGraph } from "@/types/graph";
import {
  type ColorMode,
  getColorModeLegend,
} from "../lib/colorModes";
import { useGraphStore } from "@/store/useGraphStore";
import { cn } from "@/lib/utils";

export interface ColorModeSelectorProps {
  graph: RepoGraph;
  className?: string;
}

export function ColorModeSelector({ graph, className }: ColorModeSelectorProps) {
  const colorMode = useGraphStore((s) => s.colorMode);
  const setColorMode = useGraphStore((s) => s.setColorMode);
  const impactTargetId = useGraphStore((s) => s.impactTargetId);

  const [isLegendOpen, setIsLegendOpen] = React.useState(false);

  const legendItems = React.useMemo(() => {
    return getColorModeLegend(colorMode, graph);
  }, [colorMode, graph]);

  return (
    <div
      className={cn(
        "flex flex-col items-end gap-1.5 select-none z-20",
        className
      )}
    >
      {/* Mode Switcher Bar */}
      <div className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface-panel/90 p-1 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setColorMode("cluster")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              colorMode === "cluster"
                ? "bg-surface-elevated text-text-primary shadow-sm border border-border-subtle"
                : "text-text-muted hover:text-text-secondary"
            )}
            title="Color nodes by architectural cluster / module"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span>Cluster</span>
          </button>

          <button
            type="button"
            onClick={() => setColorMode("complexity")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              colorMode === "complexity"
                ? "bg-surface-elevated text-text-primary shadow-sm border border-border-subtle"
                : "text-text-muted hover:text-text-secondary"
            )}
            title="Color nodes by cyclomatic complexity hotspot"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Complexity</span>
          </button>

          <button
            type="button"
            onClick={() => setColorMode("churn")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              colorMode === "churn"
                ? "bg-surface-elevated text-text-primary shadow-sm border border-border-subtle"
                : "text-text-muted hover:text-text-secondary"
            )}
            title="Color nodes by recent git commit velocity"
          >
            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
            <span>Churn</span>
          </button>
        </div>

        <div className="h-4 w-px bg-border-subtle mx-0.5" />

        {/* Legend Toggle Button */}
        <button
          type="button"
          onClick={() => setIsLegendOpen((prev) => !prev)}
          title={isLegendOpen ? "Hide color legend" : "Show color legend"}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-xs font-mono transition-colors cursor-pointer",
            isLegendOpen
              ? "bg-accent/15 text-accent border border-accent/25"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>

      {/* Adaptive Legend Card */}
      {isLegendOpen ? (
        <div className="w-64 rounded-xl border border-border-subtle bg-surface-panel/95 p-3 shadow-2xl backdrop-blur-md space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border-subtle/80 pb-1.5">
            <span className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider">
              {colorMode === "cluster"
                ? "Architectural Clusters"
                : colorMode === "complexity"
                ? "Cyclomatic Complexity Scale"
                : "Git Churn Activity"}
            </span>
            {impactTargetId ? (
              <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20">
                Impact Active
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 text-xs">
            {legendItems.map((item, idx) => (
              <div
                key={`legend_${idx}_${item.label}`}
                className="flex items-center justify-between gap-2 p-1 rounded bg-surface-elevated/50 border border-border-subtle/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mono text-xs text-text-primary truncate">
                    {item.label}
                  </span>
                </div>
                {item.description ? (
                  <span className="text-[10px] font-mono text-text-muted shrink-0">
                    {item.description}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
