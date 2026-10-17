"use client";

import * as React from "react";
import Sigma from "sigma";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import { createGraphologyFromRepo } from "../lib/graphologyAdapter";
import type { RepoGraph } from "@/types/graph";

export interface GraphCanvasProps {
  data: RepoGraph;
  className?: string;
}

export function GraphCanvas({ data, className }: GraphCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sigmaRef = React.useRef<Sigma | null>(null);
  const layoutRef = React.useRef<FA2Layout | null>(null);
  const [isLayoutRunning, setIsLayoutRunning] = React.useState(true);

  React.useEffect(() => {
    if (!containerRef.current || !data) return;

    // 1. Build the validated graphology graph
    const graph = createGraphologyFromRepo(data);

    // 2. Instantiate Sigma WebGL renderer
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

    // 3. Initialize ForceAtlas2 Web Worker supervisor with smooth damping
    const layout = new FA2Layout(graph, {
      settings: {
        gravity: 1.0,
        scalingRatio: 12,
        barnesHutOptimize: true,
        barnesHutTheta: 0.6,
        slowDown: 8, // Damps velocity to eliminate shivering and overshooting
        adjustSizes: true, // Prevents node overlap jitter
      },
    });

    layoutRef.current = layout;
    layout.start();
    setIsLayoutRunning(true);

    // 4. Auto-stop after 4.0 seconds once layout reaches smooth equilibrium
    const autoStopTimer = setTimeout(() => {
      if (layout.isRunning()) {
        layout.stop();
        setIsLayoutRunning(false);
      }
    }, 4000);

    // 5. Cleanup on unmount: kill both worker and WebGL renderer
    return () => {
      clearTimeout(autoStopTimer);
      layout.stop();
      layout.kill();
      layoutRef.current = null;
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

  function toggleLayout() {
    const layout = layoutRef.current;
    if (!layout) return;

    if (layout.isRunning()) {
      layout.stop();
      setIsLayoutRunning(false);
    } else {
      layout.start();
      setIsLayoutRunning(true);
    }
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-surface-base ${
        className ?? ""
      }`}
    >
      {/* WebGL Canvas Target */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Layout & Camera Controls */}
      <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-panel/90 p-1.5 shadow-xl backdrop-blur select-none">
        {/* ForceAtlas2 Worker Simulation Toggle */}
        <button
          type="button"
          onClick={toggleLayout}
          title={isLayoutRunning ? "Pause layout physics" : "Resume layout physics"}
          className="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer relative"
        >
          {isLayoutRunning ? (
            <>
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0v-12a.75.75 0 01.75-.75zm10.5 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0v-12a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            </>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="h-px bg-border-subtle/80 my-0.5" />

        {/* Camera Zoom In */}
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

        {/* Camera Zoom Out */}
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

        {/* Camera Center Reset */}
        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset camera view"
          className="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
