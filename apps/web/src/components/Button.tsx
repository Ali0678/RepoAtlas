import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer rounded-md";

  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover/90",
    secondary:
      "bg-surface-elevated text-text-primary border border-border-subtle hover:bg-surface-hover hover:border-border-focus active:bg-surface-panel",
    ghost:
      "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-panel",
    danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-9 px-3.5 text-sm gap-2",
    lg: "h-10 px-4 text-base gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}