import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  className,
  label,
  error,
  leftIcon,
  rightIcon,
  id,
  disabled,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-secondary select-none"
        >
          {label}
        </label>
      ) : null}

      <div className="relative flex items-center w-full">
        {leftIcon ? (
          <span className="absolute left-3 flex items-center justify-center text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        ) : null}

        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full h-9 rounded-md bg-surface-elevated px-3 text-sm text-text-primary placeholder:text-text-muted border border-border-subtle transition-colors outline-none",
            "focus:border-accent focus:ring-1 focus:ring-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-danger focus:border-danger focus:ring-danger",
            className
          )}
          {...props}
        />

        {rightIcon ? (
          <span className="absolute right-3 flex items-center justify-center text-text-muted">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium">{error}</p>
      ) : null}
    </div>
  );
}