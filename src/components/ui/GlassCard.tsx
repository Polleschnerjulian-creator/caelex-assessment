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
          relative rounded-2xl overflow-hidden
          ${
            highlighted
              ? "bg-white/[0.06] backdrop-blur-xl border-2 border-emerald-500/30"
              : "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
          }
          ${hover && !highlighted ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
          ${highlighted ? "shadow-[0_20px_60px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]" : "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"}
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
