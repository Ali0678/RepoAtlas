"use client";

import * as React from "react";

// Keep keyboard users inside the active overlay and return them to its trigger.
export function useDialogFocus(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  React.useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]'
        )
      ).filter(
        (element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0
      );
    (focusable()[0] ?? dialog).focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0] ?? dialog;
        const last = elements.at(-1) ?? dialog;
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, open, onClose]);
}
