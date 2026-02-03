"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "glass" | "elevated" | "interactive";
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const cardVariants = {
  default: "bg-white/[0.04] border border-white/10",
  glass: "bg-white/[0.04] backdrop-blur-xl border border-white/10",
  elevated: "bg-white/[0.06] border border-white/10 shadow-lg shadow-black/20",
  interactive: `
    bg-white/[0.04] border border-white/10
    hover:bg-white/[0.06] hover:border-white/15
    transition-all duration-200 cursor-pointer
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
    return (
      <motion.div
        ref={ref}
        className={`
          rounded-xl
          ${cardVariants[variant]}
          ${paddings[padding]}
          ${className}
        `}
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
    <Tag className={`text-[16px] font-semibold text-white ${className}`}>
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
  return <p className={`text-[13px] text-white/60 ${className}`}>{children}</p>;
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
      className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
