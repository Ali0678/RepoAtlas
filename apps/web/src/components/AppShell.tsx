"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "./hooks/useDialogFocus";

export interface AppShellProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ header, sidebar, children, className }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLElement | null>(null);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);
  useDialogFocus(drawerRef, drawerOpen, closeDrawer);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => {
      if (media.matches) closeDrawer();
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [closeDrawer]);

  return (
    <div
      className={cn(
        "atlas-workspace flex h-dvh w-full flex-col overflow-hidden bg-surface-base text-text-primary",
        className
      )}
    >
      <header
        inert={drawerOpen}
        className="min-h-14 shrink-0 border-b border-border-subtle bg-surface-panel px-3 py-2 flex items-center gap-2 z-30"
      >
        {sidebar ? (
          <button
            type="button"
            aria-label="Open sidebar"
            aria-expanded={drawerOpen}
            aria-controls="workspace-sidebar"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden h-8 w-8 shrink-0 rounded hover:bg-surface-hover"
          >
            <span aria-hidden="true">☰</span>
          </button>
        ) : null}
        <div className="flex-1 min-w-0">{header}</div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        <main
          inert={drawerOpen}
          className="flex-1 min-w-0 h-full relative overflow-hidden bg-surface-base"
        >
          {children}
        </main>
        {drawerOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={closeDrawer}
          />
        ) : null}
        {sidebar ? (
          <aside
            id="workspace-sidebar"
            ref={drawerRef}
            tabIndex={-1}
            role={drawerOpen ? "dialog" : undefined}
            aria-modal={drawerOpen || undefined}
            aria-label="Repository sidebar"
            className={cn(
              "w-80 max-w-full shrink-0 border-l border-border-subtle bg-surface-panel flex-col h-full overflow-hidden",
              drawerOpen ? "fixed right-0 top-0 z-50 flex shadow-2xl" : "hidden lg:flex"
            )}
          >
            {drawerOpen ? (
              <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-border-subtle">
                <span className="text-sm">Repository</span>
                <button
                  type="button"
                  aria-label="Close sidebar"
                  onClick={closeDrawer}
                  className="h-8 w-8 rounded hover:bg-surface-hover"
                >
                  ×
                </button>
              </div>
            ) : null}
            {sidebar}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
