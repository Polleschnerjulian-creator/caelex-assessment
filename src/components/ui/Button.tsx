"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "dark"
  | "white"
  | "white-outline"
  | "landing-primary"
  | "landing-outline";
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
  extends
    ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
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
    bg-[var(--accent-primary)] text-white shadow-[var(--v2-shadow-sm)]
    hover:bg-[var(--accent-primary-hover)]
    active:bg-[#1e40af]
    disabled:opacity-50 disabled:shadow-none
    focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]
  `,
  secondary: `
    bg-[var(--fill-light)] text-[var(--text-primary)] border border-[var(--fill-strong)]
    hover:bg-[var(--fill-medium)] hover:border-[var(--fill-heavy)]
    active:bg-[var(--fill-subtle)]
    disabled:opacity-50
    focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]
  `,
  ghost: `
    text-[var(--text-secondary)]
    hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)]
    active:bg-[var(--fill-subtle)]
    focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]
  `,
  danger: `
    bg-[var(--accent-danger)] text-white
    hover:bg-[#b91c1c]
    active:bg-[#991b1b]
    disabled:opacity-50
    focus-visible:ring-2 focus-visible:ring-[var(--accent-danger)] focus-visible:ring-offset-2
  `,
  success: `
    bg-[var(--accent-success)] text-white
    hover:bg-[#15803d]
    active:bg-[#166534]
    disabled:opacity-50
    focus-visible:ring-2 focus-visible:ring-[var(--accent-success)] focus-visible:ring-offset-2
  `,
  // Landing page variants — unchanged from V1
  dark: `
    bg-slate-900 text-white
    hover:bg-slate-800
    active:bg-slate-700
    focus:ring-2 focus:ring-slate-300
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
  "landing-primary": `
    bg-[#111827] text-white
    hover:bg-[#374151]
    active:bg-[#1f2937]
    shadow-[0_1px_3px_rgba(0,0,0,0.1)]
  `,
  "landing-outline": `
    text-[#4B5563] border border-[#D1D5DB]
    hover:border-[#111827] hover:text-[#111827]
    active:bg-[#F1F3F5]
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
  lg: "h-10 px-5 text-[14px] gap-2",
};

function getButtonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  pill: boolean,
  className: string,
) {
  const isLanding =
    variant === "white" ||
    variant === "white-outline" ||
    variant === "dark" ||
    variant === "landing-primary" ||
    variant === "landing-outline";
  const radius =
    pill || isLanding ? "rounded-full" : "rounded-[var(--v2-radius-sm)]";

  return `
    inline-flex items-center justify-center
    font-medium
    transition-all duration-[180ms] ease-out
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

    // Render as plain button (CSS transitions replace Framer Motion)
    const { disabled, ...buttonProps } = props as ButtonAsButton;
    return (
      <button
        ref={ref}
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
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
