"use client";

import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium text-white/80">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5
            bg-white/[0.06]
            border border-white/10
            rounded-lg
            text-[14px] text-white
            placeholder:text-white/60
            transition-all duration-200
            hover:border-white/20
            focus:outline-none
            focus:border-emerald-500/50
            focus:bg-white/[0.08]
            focus:ring-2 focus:ring-emerald-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""}
            ${className}
          `}
          {...props}
        />
        {hint && !error && <p className="text-[12px] text-white/70">{hint}</p>}
        {error && (
          <p className="text-[12px] text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
