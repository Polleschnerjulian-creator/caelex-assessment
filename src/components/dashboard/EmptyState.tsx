"use client";

import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const renderAction = () => {
    if (!actionLabel) return null;

    const className =
      "inline-flex items-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] active:bg-[var(--accent-primary-hover)] text-white text-body font-medium px-5 py-2.5 rounded-lg transition-colors";

    if (actionHref) {
      return (
        <Link href={actionHref} className={className}>
          {actionLabel}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={className}>
          {actionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 rounded-xl bg-[var(--surface-sunken)] flex items-center justify-center mb-5">
        <div className="text-[var(--text-tertiary)]">{icon}</div>
      </div>
      <h3 className="text-title font-medium text-[var(--text-primary)] mb-1.5">
        {title}
      </h3>
      <p className="text-body-lg text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
        {description}
      </p>
      {renderAction()}
    </div>
  );
}
