"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "glass" | "elevated" | "interactive";
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const cardVariants = {
  default:
    "bg-white border border-slate-200 shadow-sm shadow-slate-100 glass-surface relative overflow-hidden",
  glass:
    "bg-white/80 border border-slate-200 glass-elevated relative overflow-hidden",
  elevated:
    "bg-white border border-slate-200 shadow-lg shadow-slate-200/50 glass-elevated relative overflow-hidden",
  interactive: `
    bg-white border border-slate-200
    hover:bg-slate-50 hover:border-slate-300
    transition-all duration-200 cursor-pointer
    glass-surface glass-interactive relative overflow-hidden
  `,
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = "default", padding = "md", className = "", children, ...props },
    ref,
  ) => {
    const isInteractive = variant === "interactive";

    return (
      <motion.div
        ref={ref}
        className={`
          rounded-xl
          ${cardVariants[variant]}
          ${paddings[padding]}
          ${className}
        `}
        {...(isInteractive
          ? {
              whileHover: { y: -2 },
              transition: { type: "spring", stiffness: 400, damping: 25 },
            }
          : {})}
        {...props}
      >
        {children}
      </motion.div>
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
      className={`text-title font-semibold text-slate-900 dark:text-white ${className}`}
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
    <p className={`text-body text-slate-600 dark:text-white/45 ${className}`}>
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
      className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.08] ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
