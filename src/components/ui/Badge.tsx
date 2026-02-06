"use client";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variants: Record<
  BadgeVariant,
  { bg: string; text: string; dot: string }
> = {
  default: {
    bg: "bg-slate-100 dark:bg-white/10",
    text: "text-slate-600 dark:text-white/70",
    dot: "bg-slate-400 dark:bg-white/50",
  },
  success: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  error: {
    bg: "bg-red-100 dark:bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500 dark:bg-red-400",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  outline: {
    bg: "bg-transparent border border-slate-300 dark:border-white/20",
    text: "text-slate-600 dark:text-white/70",
    dot: "bg-slate-400 dark:bg-white/50",
  },
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  const style = variants[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${sizes[size]}
        ${style.bg}
        ${style.text}
        rounded-md
        font-medium
        uppercase tracking-wide
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {children}
    </span>
  );
}

// Status Badge - for compliance statuses
export type StatusType =
  | "compliant"
  | "in_progress"
  | "not_started"
  | "under_review"
  | "not_applicable";

const statusConfig: Record<
  StatusType,
  { variant: BadgeVariant; label: string }
> = {
  compliant: { variant: "success", label: "Compliant" },
  in_progress: { variant: "warning", label: "In Progress" },
  not_started: { variant: "default", label: "Not Started" },
  under_review: { variant: "info", label: "Under Review" },
  not_applicable: { variant: "outline", label: "N/A" },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: StatusType;
  className?: string;
}) {
  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  );
}
