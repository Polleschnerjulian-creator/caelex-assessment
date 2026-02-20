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
          relative rounded-xl overflow-hidden
          ${
            highlighted
              ? "bg-white border-2 border-emerald-500/20 dark:bg-white/[0.06] dark:backdrop-blur-xl dark:border-emerald-500/30"
              : "bg-white border border-slate-200 dark:bg-white/[0.06] dark:backdrop-blur-xl dark:border-white/10"
          }
          ${hover && !highlighted ? "transition-all duration-500 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-white/10 dark:hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
          ${highlighted ? "shadow-[0_4px_20px_rgba(16,185,129,0.1)] dark:shadow-[0_20px_60px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]" : "shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"}
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
