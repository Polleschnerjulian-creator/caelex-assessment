"use client";

import { forwardRef, useId } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      error,
      className = "",
      id: externalId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = externalId || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
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
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            aria-required={props.required}
            className={`
              w-full h-9 px-3 pr-10
              bg-white
              border border-[var(--border-default)]
              rounded-[var(--v2-radius-sm)]
              text-[14px] text-[var(--text-primary)]
              appearance-none
              transition-all duration-[180ms] ease-out
              hover:border-[var(--text-tertiary)]
              focus:outline-none
              focus:border-[var(--border-focus)]
              focus:ring-2 focus:ring-[var(--border-focus)]/20
              disabled:bg-[var(--surface-sunken)] disabled:opacity-60 disabled:cursor-not-allowed
              cursor-pointer
              ${error ? "border-[var(--accent-danger)]" : ""}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option
                value=""
                disabled
                className="bg-white text-[var(--text-tertiary)]"
              >
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white text-[var(--text-primary)]"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
        </div>
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

Select.displayName = "Select";
