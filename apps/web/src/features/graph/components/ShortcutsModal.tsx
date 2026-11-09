"use client";

import * as React from "react";
import { useDialogFocus } from "@/components/hooks/useDialogFocus";

export interface ShortcutsModalProps {
  onClose: () => void;
}

// Keyboard shortcuts reference dialog, opened by pressing "?".
// Focus is trapped: Tab stays on the close button (single interactive element).
// Escape closes the modal without propagating to the global Escape handler.
// The backdrop click also closes it; inner panel click is stopPropagated.
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl/Cmd", "K"], label: "Focus search" },
  { keys: ["+"], label: "Zoom in" },
  { keys: ["-"], label: "Zoom out" },
  { keys: ["0"], label: "Reset camera" },
  { keys: ["Esc"], label: "Deselect / close panel" },
  { keys: ["?"], label: "Toggle this dialog" },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, true, onClose);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "?") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="relative w-80 rounded-xl border border-border-subtle bg-surface-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(event) => {
              if (event.key === "?") {
                event.stopPropagation();
                onClose();
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Close shortcuts dialog"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <ul className="space-y-2.5">
          {SHORTCUTS.map(({ keys, label }) => (
            <li key={label} className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-secondary">{label}</span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center rounded border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-primary shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
