"use client";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "danger"
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
    bg: "bg-[var(--fill-medium)]",
    text: "text-[var(--text-secondary)]",
    dot: "bg-[var(--text-tertiary)]",
  },
  primary: {
    bg: "bg-[var(--accent-primary-soft)]",
    text: "text-[var(--accent-primary)]",
    dot: "bg-[var(--accent-primary)]",
  },
  success: {
    bg: "bg-[var(--accent-success-soft)]",
    text: "text-[var(--accent-success)]",
    dot: "bg-[var(--accent-success)]",
  },
  warning: {
    bg: "bg-[var(--accent-warning-soft)]",
    text: "text-[var(--accent-warning)]",
    dot: "bg-[var(--accent-warning)]",
  },
  error: {
    bg: "bg-[var(--accent-danger-soft)]",
    text: "text-[var(--accent-danger)]",
    dot: "bg-[var(--accent-danger)]",
  },
  danger: {
    bg: "bg-[var(--accent-danger-soft)]",
    text: "text-[var(--accent-danger)]",
    dot: "bg-[var(--accent-danger)]",
  },
  info: {
    bg: "bg-[var(--accent-info-soft)]",
    text: "text-[var(--accent-info)]",
    dot: "bg-[var(--accent-info)]",
  },
  outline: {
    bg: "bg-transparent border border-[var(--fill-strong)]",
    text: "text-[var(--text-secondary)]",
    dot: "bg-[var(--text-tertiary)]",
  },
};

const sizes: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5 text-[12px]",
  md: "h-6 px-2 text-[12px]",
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
        rounded-full
        font-medium
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
      )}
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
