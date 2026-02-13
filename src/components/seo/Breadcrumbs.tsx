"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { BreadcrumbJsonLd } from "./JsonLd";
import { siteConfig } from "@/lib/seo";
import type { BreadcrumbItem } from "@/lib/breadcrumbs";

// Re-export types and helpers for convenience
export type { BreadcrumbItem } from "@/lib/breadcrumbs";
export {
  generateModuleBreadcrumbs,
  generateJurisdictionBreadcrumbs,
  generateBlogBreadcrumbs,
  generateGuideBreadcrumbs,
  generateGlossaryBreadcrumbs,
  generateCompareBreadcrumbs,
} from "@/lib/breadcrumbs";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  // Build full URLs for JSON-LD
  const jsonLdItems = [
    { name: "Home", url: siteConfig.url },
    ...items.map((item) => ({
      name: item.label,
      url: `${siteConfig.url}${item.href}`,
    })),
  ];

  return (
    <>
      {/* JSON-LD Schema */}
      <BreadcrumbJsonLd items={jsonLdItems} />

      {/* Visual Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center gap-1.5 text-[13px] text-white/40 ${className}`}
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-white/60 transition-colors"
        >
          <Home size={14} />
          <span className="sr-only">Home</span>
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={item.href} className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-white/20" />
              {isLast ? (
                <span className="text-white/60" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-white/60 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
