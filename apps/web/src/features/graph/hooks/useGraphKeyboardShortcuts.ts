"use client";

import * as React from "react";
import type Sigma from "sigma";

export interface UseGraphKeyboardShortcutsOptions {
  sigmaRef: React.RefObject<Sigma | null>;
  onFocusSearch: () => void;
  onToggleShortcuts: () => void;
  onEscape: () => void;
}

// Registers document-level keyboard shortcuts for the explore page.
// All shortcuts fire on `window` keydown regardless of focus,
// EXCEPT +/-/0 which are skipped when focus is inside an input or textarea
// so users can type normally.
//
// Shortcut map:
//   Cmd/Ctrl+K  → select text in the search input
//   +           → zoom in  (camera ratio × 0.75; smaller ratio = closer)
//   -           → zoom out (camera ratio × 1.33)
//   0           → reset camera to center, ratio 1, angle 0
//   ?           → toggle the shortcuts cheat-sheet modal
//   Escape      → delegated to onEscape (deselect / close panel / exit impact)
export function useGraphKeyboardShortcuts({
  sigmaRef,
  onFocusSearch,
  onToggleShortcuts,
  onEscape,
}: UseGraphKeyboardShortcutsOptions) {
  React.useEffect(() => {
    function isEditingText(e: KeyboardEvent): boolean {
      const target = e.target as HTMLElement | null;
      return !!target?.closest("input, textarea, select, [contenteditable=true]");
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      // Cmd/Ctrl+K: focus the graph search, opening its drawer on mobile.
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (e.key === "Escape") {
        onEscape();
        return;
      }
      // Skip canvas shortcuts when the user is typing in a form field
      if (isEditingText(e) || e.metaKey || e.ctrlKey || e.altKey) return;

      const renderer = sigmaRef.current;

      switch (e.key) {
        case "+":
        case "=": {
          // "=" is the unshifted key on most keyboards for the same physical key as "+"
          if (renderer) {
            const cam = renderer.getCamera();
            cam.animate({ ratio: cam.ratio * 0.75 }, { duration: 200 });
          }
          break;
        }
        case "-": {
          if (renderer) {
            const cam = renderer.getCamera();
            cam.animate({ ratio: cam.ratio * 1.33 }, { duration: 200 });
          }
          break;
        }
        case "0": {
          if (renderer) {
            renderer.getCamera().animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { duration: 350 });
          }
          break;
        }
        case "?": {
          onToggleShortcuts();
          break;
        }
        case "Escape": {
          onEscape();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sigmaRef, onFocusSearch, onToggleShortcuts, onEscape]);
}
