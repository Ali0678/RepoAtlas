"use client";

import * as React from "react";
import Sigma from "sigma";
import { createGraphologyFromRepo } from "../lib/graphologyAdapter";
import type { RepoGraph } from "@/types/graph";

export interface GraphCanvasProps {
  data: RepoGraph;
  className?: string;
}

export function GraphCanvas({ data, className }: GraphCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sigmaRef = React.useRef<Sigma | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || !data) return;

    // Convert domain RepoGraph into graphology data structure
    const graph = createGraphologyFromRepo(data);

    // Instantiate Sigma WebGL engine on the container
    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      minCameraRatio: 0.05,
      maxCameraRatio: 15,
      defaultNodeColor: "#3b82f6",
      defaultEdgeColor: "#27272a",
      labelFont: "var(--font-sans), system-ui, sans-serif",
      labelColor: { color: "#f4f4f5" },
      labelSize: 11,
      labelWeight: "500",
      enableEdgeEvents: false,
      allowInvalidContainer: true,
    });

    sigmaRef.current = renderer;

    return () => {
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [data]);

  function handleZoomIn() {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 250 });
  }

  function handleZoomOut() {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 250 });
  }

  function handleResetCamera() {
    sigmaRef.current?.getCamera().animatedReset({ duration: 250 });
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-surface-base ${className ?? ""}`}>
      {/* WebGL Canvas Mount Target */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Camera Controls */}
      <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-panel/90 p-1.5 shadow-xl backdrop-blur select-none">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <div className="h-px bg-border-subtle/80 my-0.5" />

        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset camera view"
          className="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer text-xs font-mono font-bold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
