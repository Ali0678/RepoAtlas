import * as React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border-subtle bg-surface-panel text-text-primary shadow-lg overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PanelHeader({
  className,
  title,
  subtitle,
  actions,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border-subtle px-4 py-3 bg-surface-panel select-none shrink-0",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex flex-col min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold text-text-primary truncate">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-xs text-text-muted truncate">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {actions}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export interface PanelContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PanelContent({
  className,
  children,
  ...props
}: PanelContentProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-4 text-sm text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PanelFooter({
  className,
  children,
  ...props
}: PanelFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3 bg-surface-panel shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}