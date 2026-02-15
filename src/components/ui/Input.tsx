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
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-slate-700 dark:text-white/80"
          >
            {label}
            {props.required && (
              <span
                className="text-red-500 dark:text-red-400 ml-1"
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
            w-full px-4 py-2.5
            bg-white dark:bg-white/[0.06]
            border border-slate-200 dark:border-white/10
            rounded-lg
            text-[14px] text-slate-900 dark:text-white
            placeholder:text-slate-400 dark:placeholder:text-white/60
            transition-all duration-200
            hover:border-slate-300 dark:hover:border-white/20
            focus:outline-none
            focus:border-emerald-500/50
            focus:bg-slate-50 dark:focus:bg-white/[0.08]
            focus:ring-2 focus:ring-emerald-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p
            id={hintId}
            className="text-[12px] text-slate-600 dark:text-white/70"
          >
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1.5"
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
