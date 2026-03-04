"use client";

import { forwardRef } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  highlighted?: boolean;
  children: React.ReactNode;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    { hover = true, highlighted = false, className = "", children, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`
          relative rounded-xl overflow-hidden border
          bg-white border-slate-200 shadow-sm
          glass-elevated
          ${highlighted ? "border-[#111827] shadow-[0_4px_20px_rgba(0,0,0,0.08)]" : ""}
          ${hover && !highlighted ? "glass-interactive hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
