"use client";

import { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-emerald-500 text-white
    hover:bg-emerald-600
    active:bg-emerald-700
    disabled:bg-emerald-500/50
    focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-[#0A0A0B]
  `,
  secondary: `
    bg-white/[0.06] text-white border border-white/10
    hover:bg-white/[0.10] hover:border-white/20
    active:bg-white/[0.12]
    disabled:opacity-50
    focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0A0A0B]
  `,
  ghost: `
    text-white/70
    hover:text-white hover:bg-white/[0.06]
    active:bg-white/[0.08]
    focus:ring-2 focus:ring-white/20
  `,
  danger: `
    bg-red-500/10 text-red-400 border border-red-500/20
    hover:bg-red-500/20 hover:border-red-500/30
    active:bg-red-500/30
    focus:ring-2 focus:ring-red-500/30
  `,
  dark: `
    bg-[#0A0B10] text-white
    hover:bg-[#15161B]
    active:bg-[#1A1B20]
    focus:ring-2 focus:ring-white/20
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px] rounded-md gap-1.5",
  md: "px-4 py-2 text-[13px] rounded-lg gap-2",
  lg: "px-6 py-2.5 text-[14px] rounded-lg gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      children,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        className={`
          inline-flex items-center justify-center
          font-medium
          transition-colors duration-200
          focus:outline-none
          disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${variant === "dark" ? "rounded-full" : ""}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        <span>{children}</span>
      </motion.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
