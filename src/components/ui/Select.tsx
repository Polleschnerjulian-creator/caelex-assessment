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
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
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
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            aria-required={props.required}
            className={`
              w-full px-4 py-2.5 pr-10
              bg-white dark:bg-white/[0.06]
              border border-slate-200 dark:border-white/10
              rounded-lg
              text-[14px] text-slate-900 dark:text-white
              appearance-none
              transition-all duration-200
              hover:border-slate-300 dark:hover:border-white/20
              focus:outline-none
              focus:border-emerald-500/50
              focus:ring-2 focus:ring-emerald-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer
              ${error ? "border-red-500/50" : ""}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option
                value=""
                disabled
                className="bg-white dark:bg-[#1a1a1b] text-slate-500 dark:text-white/70"
              >
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white dark:bg-[#1a1a1b] text-slate-900 dark:text-white"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white/70" />
          </div>
        </div>
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

Select.displayName = "Select";
