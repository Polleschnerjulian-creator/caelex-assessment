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
          relative rounded-[var(--radius-lg)] overflow-hidden border
          bg-[var(--glass-bg)] border-[var(--glass-border)]
          shadow-[var(--shadow-md)]
          backdrop-blur-[60px] backdrop-saturate-[1.5]
          ${highlighted ? "border-[var(--accent-400)] shadow-[var(--shadow-glow-accent)]" : ""}
          ${hover && !highlighted ? "transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-px hover:border-[var(--glass-border-hover)]" : ""}
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
