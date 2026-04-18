"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { findLegalItem } from "@/lib/legal/navigation";

/**
 * Breadcrumb trail for /legal/* pages.
 * Home › Legal › [Category] › [Document]
 */
export function LegalBreadcrumbs({ lang = "de" }: { lang?: "de" | "en" }) {
  const pathname = usePathname() ?? "";
  const found = findLegalItem(pathname);

  const legalLabel = lang === "de" ? "Legal" : "Legal";
  const homeLabel = lang === "de" ? "Start" : "Home";

  const parts: { label: string; href?: string }[] = [
    { label: homeLabel, href: "/" },
    { label: legalLabel, href: "/legal" },
  ];

  if (found) {
    parts.push({
      label: lang === "de" ? found.category.label : found.category.labelEn,
      href: `/legal#${found.category.id}`,
    });
    parts.push({
      label:
        lang === "de"
          ? found.item.label
          : (found.item.labelEn ?? found.item.label),
    });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 -mt-2 flex items-center flex-wrap text-small text-[#6B7280]"
    >
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && (
            <ChevronRight
              size={12}
              className="mx-1.5 text-[#D1D5DB] flex-shrink-0"
              aria-hidden="true"
            />
          )}
          {p.href ? (
            <Link
              href={p.href}
              className="hover:text-[#111827] inline-flex items-center gap-1"
            >
              {i === 0 && (
                <Home size={11} className="flex-shrink-0" aria-hidden="true" />
              )}
              {p.label}
            </Link>
          ) : (
            <span className="text-[#111827] font-medium truncate">
              {p.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
