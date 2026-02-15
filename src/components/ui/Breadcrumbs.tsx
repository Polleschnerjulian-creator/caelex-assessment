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
      className={`flex items-center gap-1 text-[13px] ${className}`}
    >
      {showHome && (
        <>
          <Link
            href="/dashboard"
            aria-label="Dashboard home"
            className="text-white/70 hover:text-white transition-colors p-1 -ml-1 rounded"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
          {items.length > 0 && (
            <ChevronRight
              className="w-4 h-4 text-white/30 flex-shrink-0"
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
                className="text-white/70 hover:text-white transition-colors truncate max-w-[150px]"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate max-w-[200px] ${
                  isLast ? "text-white/80 font-medium" : "text-white/70"
                }`}
                title={item.label}
                {...(isLast ? { "aria-current": "page" as const } : {})}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight
                className="w-4 h-4 text-white/30 flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
