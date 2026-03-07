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
    "bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--v2-shadow-soft)] relative overflow-hidden",
  glass:
    "bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--v2-shadow-soft)] relative overflow-hidden",
  elevated:
    "bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--v2-shadow-md)] relative overflow-hidden",
  interactive: `
    bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--v2-shadow-soft)]
    hover:shadow-[var(--v2-shadow-md)] hover:-translate-y-px hover:border-[var(--border-default)]
    transition-all duration-[180ms] ease-out cursor-pointer relative overflow-hidden
  `,
  metric:
    "bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--v2-shadow-soft)] relative overflow-hidden",
  outlined:
    "bg-transparent border border-[var(--border-default)] relative overflow-hidden",
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
          rounded-[var(--v2-radius-md)]
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
      className={`text-title font-semibold text-[var(--text-primary)] ${className}`}
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
    <p className={`text-body text-[var(--text-secondary)] ${className}`}>
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
      className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-default)] ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
