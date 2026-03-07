"use client";

import { forwardRef, useId } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = externalId || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const describedBy =
      [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[var(--text-primary)]"
          >
            {label}
            {props.required && (
              <span
                className="text-[var(--accent-danger)] ml-1"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={props.required}
          className={`
            w-full h-9 px-3
            bg-[var(--fill-inset)]
            border border-[var(--border-subtle)]
            rounded-[var(--v2-radius-sm)]
            text-[14px] text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-all duration-[180ms] ease-out
            shadow-[var(--shadow-inset)]
            hover:border-[var(--fill-heavy)]
            focus:outline-none
            focus:border-[var(--accent-500)]
            focus:ring-2 focus:ring-[var(--accent-500)]/20
            disabled:bg-[var(--fill-subtle)] disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]/15" : ""}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-[12px] text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="text-[12px] text-[var(--accent-danger)] flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
