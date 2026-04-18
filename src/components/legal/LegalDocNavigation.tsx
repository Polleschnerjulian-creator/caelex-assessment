"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Lock,
  Shield,
  Users,
  ScrollText,
  BookOpen,
} from "lucide-react";
import { LEGAL_CATEGORIES, type LegalCategory } from "@/lib/legal/navigation";

const ICONS: Record<
  LegalCategory["icon"],
  React.ComponentType<{ size?: number; className?: string }>
> = {
  terms: FileText,
  privacy: Lock,
  security: Shield,
  consumer: Users,
  policy: ScrollText,
  reference: BookOpen,
};

/**
 * Left-rail navigation for every /legal/* page.
 * Highlights the current route, collapses translation duplicates by language.
 */
export function LegalDocNavigation({ lang = "de" }: { lang?: "de" | "en" }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Legal document navigation"
      className="hidden lg:block w-[240px] flex-shrink-0"
    >
      <div className="sticky top-32 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 py-2">
        <div className="text-caption font-semibold uppercase tracking-[0.15em] text-[#6B7280] mb-5">
          Legal Hub
        </div>

        {LEGAL_CATEGORIES.map((category) => {
          const Icon = ICONS[category.icon];
          const visibleItems = category.items.filter((it) => {
            if (!it.isTranslation) return true;
            // show translation only when looking at matching language
            return lang === "en" ? it.id.endsWith("-en") : false;
          });

          return (
            <div key={category.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={11} className="text-[#6B7280]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                  {lang === "de" ? category.label : category.labelEn}
                </span>
              </div>
              <ul className="space-y-0.5 ml-[18px]">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`block text-[12px] leading-snug py-1 transition-colors ${
                          isActive
                            ? "text-[#111827] font-medium"
                            : "text-[#4B5563] hover:text-[#111827]"
                        }`}
                      >
                        {lang === "de"
                          ? item.label
                          : (item.labelEn ?? item.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
          <Link
            href="/legal"
            className="text-[11px] text-[#4B5563] hover:text-[#111827] inline-flex items-center gap-1"
          >
            ← {lang === "de" ? "Alle Dokumente" : "All documents"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
