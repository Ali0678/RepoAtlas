import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// forwardRef so callers (e.g. the search input in ExplorePage) can pass a ref
// and the keyboard shortcut hook (Cmd+K) can focus the underlying <input>.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, leftIcon, rightIcon, id, disabled, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary select-none">
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
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
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
        <p id={`${inputId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
