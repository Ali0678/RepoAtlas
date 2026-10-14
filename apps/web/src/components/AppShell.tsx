import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({
  header,
  sidebar,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "flex h-screen w-screen flex-col overflow-hidden bg-surface-base text-text-primary",
        className
      )}
    >
      <header className="h-14 shrink-0 border-b border-border-subtle bg-surface-panel px-4 flex items-center justify-between">
        {header}
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 h-full relative overflow-hidden bg-surface-base">
          {children}
        </main>

        {sidebar ? (
          <aside className="w-80 shrink-0 border-l border-border-subtle bg-surface-panel flex flex-col h-full overflow-hidden">
            {sidebar}
          </aside>
        ) : null}
      </div>
    </div>
  );
}