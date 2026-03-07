"use client";

import { forwardRef } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "glass"
    | "elevated"
    | "interactive"
    | "metric"
    | "outlined";
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const cardVariants = {
  default:
    "bg-[var(--bg-surface-2)] border border-[rgba(255,255,255,0.06)] shadow-[var(--shadow-sm)] relative overflow-hidden",
  glass: `
    bg-[var(--glass-bg)] backdrop-blur-[20px] backdrop-saturate-[1.2]
    border border-[var(--glass-border)]
    shadow-[var(--shadow-md)] relative overflow-hidden
  `,
  elevated: `
    bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_100%)]
    backdrop-blur-[24px] backdrop-saturate-[1.3]
    border border-[rgba(255,255,255,0.08)]
    shadow-[var(--shadow-lg),inset_0_1px_0_rgba(255,255,255,0.04)]
    relative overflow-hidden
  `,
  interactive: `
    bg-[var(--glass-bg)] backdrop-blur-[20px]
    border border-[var(--glass-border)]
    shadow-[var(--shadow-md)]
    hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)]
    hover:shadow-[var(--shadow-lg)] hover:-translate-y-px
    transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]
    cursor-pointer relative overflow-hidden
  `,
  metric: `
    bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_100%)]
    backdrop-blur-[24px] backdrop-saturate-[1.3]
    border border-[rgba(255,255,255,0.08)]
    border-t-2
    shadow-[var(--shadow-lg),inset_0_1px_0_rgba(255,255,255,0.04)]
    hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)]
    transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]
    relative overflow-hidden
  `,
  outlined:
    "bg-transparent border border-[rgba(255,255,255,0.06)] relative overflow-hidden",
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = "default", padding = "md", className = "", children, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-[var(--radius-lg)]
          ${cardVariants[variant]}
          ${paddings[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

// Card Title
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({
  children,
  className = "",
  as: Tag = "h3",
}: CardTitleProps) {
  return (
    <Tag
      className={`text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] ${className}`}
    >
      {children}
    </Tag>
  );
}

// Card Description
interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return (
    <p
      className={`text-[13px] text-[var(--text-secondary)] leading-relaxed ${className}`}
    >
      {children}
    </p>
  );
}

// Card Content
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

// Card Footer
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[rgba(255,255,255,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
