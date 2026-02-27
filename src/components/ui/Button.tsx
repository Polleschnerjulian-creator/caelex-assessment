"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dark"
  | "white"
  | "white-outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

interface ButtonAsButton
  extends ButtonBaseProps, Omit<HTMLMotionProps<"button">, "children"> {
  href?: never;
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string;
  className?: string;
  onClick?: () => void;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-emerald-500 text-white
    hover:bg-emerald-600
    active:bg-emerald-700
    disabled:bg-emerald-500/50
    focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-bg
  `,
  secondary: `
    bg-slate-100 dark:bg-[--glass-bg-surface] text-slate-800 dark:text-white border border-slate-200 dark:border-[--glass-border-subtle]
    hover:bg-slate-200 dark:hover:bg-[--glass-bg-elevated] hover:border-slate-300 dark:hover:border-[--glass-border-hover]
    active:bg-slate-300 dark:active:bg-white/[0.12]
    disabled:opacity-50
    focus:ring-2 focus:ring-slate-300 dark:focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-bg
  `,
  ghost: `
    text-slate-700 dark:text-white/70
    hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface]
    active:bg-slate-200 dark:active:bg-[--glass-bg-elevated]
    focus:ring-2 focus:ring-slate-300 dark:focus:ring-white/20
  `,
  danger: `
    bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20
    hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/30
    active:bg-red-200 dark:active:bg-red-500/30
    focus:ring-2 focus:ring-red-500/30
  `,
  dark: `
    bg-slate-900 dark:bg-dark-bg text-white
    hover:bg-slate-800 dark:hover:bg-[#15161B]
    active:bg-slate-700 dark:active:bg-[#1A1B20]
    focus:ring-2 focus:ring-slate-300 dark:focus:ring-white/20
  `,
  white: `
    bg-white text-black
    hover:bg-white/90
    active:bg-white/80
  `,
  "white-outline": `
    text-white/70 border border-white/20
    hover:border-white/40 hover:text-white
    active:bg-white/[0.04]
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-body gap-1.5",
  md: "px-6 py-3 text-body-lg gap-2",
  lg: "px-8 py-4 text-subtitle gap-2",
};

function getButtonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  pill: boolean,
  className: string,
) {
  const isLanding =
    variant === "white" || variant === "white-outline" || variant === "dark";
  const radius = pill || isLanding ? "rounded-full" : "rounded-lg";

  return `
    inline-flex items-center justify-center
    font-medium
    transition-all duration-200
    focus:outline-none
    disabled:cursor-not-allowed
    ${variants[variant]}
    ${sizes[size]}
    ${radius}
    ${className}
  `;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      pill = false,
      loading,
      icon,
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    const classes = getButtonClasses(variant, size, pill, className);

    // Render as Link when href is provided
    if ("href" in props && props.href) {
      const { href, onClick, ...rest } = props as ButtonAsLink;
      return (
        <Link href={href} onClick={onClick} className={classes} {...rest}>
          {icon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{children}</span>
        </Link>
      );
    }

    // Render as motion.button
    const { disabled, ...buttonProps } = props as ButtonAsButton;
    return (
      <motion.button
        ref={ref}
        whileHover={{
          scale: disabled || loading ? 1 : 1.01,
          filter: disabled || loading ? "none" : "brightness(1.05)",
        }}
        whileTap={{
          scale: disabled || loading ? 1 : 0.98,
          filter: disabled || loading ? "none" : "brightness(0.95)",
        }}
        transition={{ duration: 0.15 }}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        {...buttonProps}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {loading && <span className="sr-only">Loading</span>}
        <span>{children}</span>
      </motion.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
