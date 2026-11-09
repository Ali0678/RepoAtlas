import * as React from "react";

// A pulsing skeleton that fills the main canvas area while getGraph() is in flight.
// Uses CSS animate-pulse (Tailwind) on scattered circles and fake SVG edges to
// suggest a force-directed graph taking shape. No third-party skeleton library needed.
export function GraphLoadingState() {
  return (
    <div
      role="status"
      aria-label="Loading graph"
      className="flex h-full w-full flex-col items-center justify-center gap-8 select-none"
    >
      {/* Fake graph skeleton */}
      <div className="relative w-72 h-48">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-accent/20 animate-pulse" />
        <div className="absolute top-4 left-10 h-6 w-6 rounded-full bg-surface-elevated animate-pulse [animation-delay:150ms]" />
        <div className="absolute top-8 right-8 h-8 w-8 rounded-full bg-surface-elevated animate-pulse [animation-delay:300ms]" />
        <div className="absolute bottom-6 left-16 h-5 w-5 rounded-full bg-surface-elevated animate-pulse [animation-delay:100ms]" />
        <div className="absolute bottom-4 right-16 h-7 w-7 rounded-full bg-surface-elevated animate-pulse [animation-delay:450ms]" />
        <div className="absolute top-16 left-4 h-4 w-4 rounded-full bg-surface-elevated animate-pulse [animation-delay:200ms]" />
        <div className="absolute top-20 right-4 h-5 w-5 rounded-full bg-accent/10 animate-pulse [animation-delay:350ms]" />
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          aria-hidden="true"
        >
          <line x1="144" y1="96" x2="50" y2="22" stroke="#3b82f6" strokeWidth="1" />
          <line x1="144" y1="96" x2="232" y2="38" stroke="#3b82f6" strokeWidth="1" />
          <line x1="144" y1="96" x2="96" y2="162" stroke="#3b82f6" strokeWidth="1" />
          <line x1="144" y1="96" x2="208" y2="156" stroke="#3b82f6" strokeWidth="1" />
          <line x1="144" y1="96" x2="22" y2="104" stroke="#3b82f6" strokeWidth="1" />
          <line x1="144" y1="96" x2="258" y2="104" stroke="#3b82f6" strokeWidth="1" />
        </svg>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-secondary font-medium">Initializing WebGL canvas</p>
        </div>
        <p className="text-xs text-text-muted">Building dependency graph…</p>
      </div>
    </div>
  );
}
