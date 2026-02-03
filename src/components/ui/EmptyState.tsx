"use client";

import { ReactNode } from "react";
import Button from "./Button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6">
        <div className="text-white/60">{icon}</div>
      </div>

      <h3 className="text-[16px] font-medium text-white mb-2">{title}</h3>

      <p className="text-[13px] text-white/60 max-w-sm mb-6">{description}</p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              variant={action.variant || "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact empty state for smaller areas
interface CompactEmptyStateProps {
  icon: ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function CompactEmptyState({
  icon,
  message,
  action,
  className = "",
}: CompactEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}
    >
      <div className="text-white/30 mb-3">{icon}</div>
      <p className="text-[13px] text-white/70 mb-3">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
