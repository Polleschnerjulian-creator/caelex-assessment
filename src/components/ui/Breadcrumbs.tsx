"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className = "",
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-body ${className}`}
    >
      {showHome && (
        <>
          <Link
            href="/dashboard"
            aria-label="Dashboard home"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[180ms] p-1 -ml-1 rounded-[var(--v2-radius-sm)]"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
          {items.length > 0 && (
            <ChevronRight
              className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
              aria-hidden="true"
            />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[180ms] truncate max-w-[150px]"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate max-w-[200px] ${
                  isLast
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-secondary)]"
                }`}
                title={item.label}
                {...(isLast ? { "aria-current": "page" as const } : {})}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight
                className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
