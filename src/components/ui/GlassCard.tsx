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
          relative rounded-[var(--v2-radius-md)] overflow-hidden border
          bg-[var(--surface-raised)] border-[var(--border-subtle)] shadow-[var(--v2-shadow-soft)]
          ${highlighted ? "border-[var(--accent-primary)] shadow-[var(--v2-shadow-md)]" : ""}
          ${hover && !highlighted ? "transition-all duration-[180ms] ease-out hover:shadow-[var(--v2-shadow-md)] hover:-translate-y-px hover:border-[var(--border-default)]" : ""}
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
