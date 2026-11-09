import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ShortcutsModal } from "@/features/graph/components/ShortcutsModal";
import { GraphLoadingState } from "@/features/graph/components/GraphLoadingState";
import { GraphErrorState } from "@/features/graph/components/GraphErrorState";
import { GraphEmptyState } from "@/features/graph/components/GraphEmptyState";
import { useGraphKeyboardShortcuts } from "@/features/graph/hooks/useGraphKeyboardShortcuts";

afterEach(cleanup);

describe("async graph states", () => {
  it("announces loading and empty states", () => {
    const { rerender } = render(<GraphLoadingState />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Loading graph");
    rerender(<GraphEmptyState />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("No files found");
  });
  it("announces errors and lets the user retry", () => {
    const retry = vi.fn();
    render(<GraphErrorState message="Network unavailable" onRetry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

it("focuses the modal and restores its trigger without leaking Escape", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  const close = vi.fn();
  const globalEscape = vi.fn();
  window.addEventListener("keydown", globalEscape);
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const { unmount } = render(<ShortcutsModal onClose={close} />);
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Close shortcuts dialog" })
  );
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
  expect(globalEscape).not.toHaveBeenCalled();
  unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
  window.removeEventListener("keydown", globalEscape);
});

it("allows Escape while typing, but does not zoom while typing", () => {
  const escape = vi.fn();
  const focusSearch = vi.fn();
  const animate = vi.fn();
  function Harness() {
    const sigmaRef = React.useRef({ getCamera: () => ({ ratio: 1, animate }) });
    useGraphKeyboardShortcuts({
      sigmaRef: sigmaRef as unknown as Parameters<typeof useGraphKeyboardShortcuts>[0]["sigmaRef"],
      onFocusSearch: focusSearch,
      onEscape: escape,
      onToggleShortcuts: vi.fn(),
    });
    return <input aria-label="Question" />;
  }
  render(<Harness />);
  const input = screen.getByRole("textbox");
  fireEvent.keyDown(input, { key: "+" });
  expect(animate).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(escape).toHaveBeenCalledOnce();
  fireEvent.keyDown(input, { key: "k", ctrlKey: true });
  expect(focusSearch).toHaveBeenCalledOnce();
});
