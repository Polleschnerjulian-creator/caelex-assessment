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
      role="status"
      className={`flex flex-col items-center justify-center py-16 px-8 text-center max-w-[400px] mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-[var(--v2-radius-md)] bg-[var(--surface-sunken)] flex items-center justify-center mb-5">
        <div className="text-[var(--text-tertiary)]" aria-hidden="true">
          {icon}
        </div>
      </div>

      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>

      <p className="text-[14px] text-[var(--text-secondary)] mb-6">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              variant={action.variant || "primary"}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="md" onClick={secondaryAction.onClick}>
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
      role="status"
      className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}
    >
      <div className="text-[var(--text-tertiary)] mb-3" aria-hidden="true">
        {icon}
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-3">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[12px] text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors duration-[180ms]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
