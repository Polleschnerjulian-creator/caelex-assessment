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
      "inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[13px] font-medium px-5 py-2.5 rounded-lg transition-colors";

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
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-5">
        <div className="text-slate-400 dark:text-white/30">{icon}</div>
      </div>
      <h3 className="text-[16px] font-medium text-slate-900 dark:text-white/80 mb-1.5">
        {title}
      </h3>
      <p className="text-[14px] text-slate-500 dark:text-white/40 max-w-sm mx-auto mb-6">
        {description}
      </p>
      {renderAction()}
    </div>
  );
}
