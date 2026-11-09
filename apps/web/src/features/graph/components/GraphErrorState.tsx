import * as React from "react";

export interface GraphErrorStateProps {
  message: string;
  onRetry: () => void;
}

// Shown when getGraph() rejects. Displays the raw error message so the user
// knows whether the problem is a bad URL, network failure, or server error.
// The Retry button calls onRetry, which re-runs the fetch without a page reload.
export function GraphErrorState({ message, onRetry }: GraphErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 ring-1 ring-danger/30">
        <svg
          className="h-7 w-7 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-text-primary">
          Failed to load graph
        </h2>
        <p className="text-sm text-text-muted max-w-sm">{message}</p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base cursor-pointer"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Retry
      </button>
    </div>
  );
}
