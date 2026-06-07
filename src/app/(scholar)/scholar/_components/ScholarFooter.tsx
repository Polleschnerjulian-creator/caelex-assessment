"use client";

/**
 * ScholarFooter — compact footer for the Caelex Scholar APP.
 *
 * Mounted ONCE in ScholarShell, inside the content column (the <main> that
 * tracks the sidebar width), AFTER {children} — so it appears at the bottom of
 * every Scholar page (search / library / cases / sources / saved / settings /
 * legal) and never overlaps the fixed sidebar.
 *
 * i18n: link labels + notices resolve through the `footer` namespace. This is a
 * client component → it reads the active UI locale from the LocaleProvider via
 * useScholarLocale() (per the wiring contract: client comps use the hook, not
 * props).
 *
 * Design — DELIBERATELY light, matching the brief:
 *   • white background, near-black text (bg-white text-gray-900); muted links
 *     text-gray-600 → hover text-gray-900; top border border-gray-200.
 *   • STRICTLY MONOCHROME — only black / white / gray-* Tailwind classes.
 *
 * Accessibility (WCAG 2.2 AA):
 *   • <footer> landmark + aria-label (1.3.1 / 2.4.1).
 *   • Nested <nav aria-label> for the legal-link list (2.4.1).
 *   • Link contrast: gray-600 on white ≈ 5.7:1 ✓ (1.4.3); gray-900 ≈ 17:1.
 *   • focus-visible ring on every link (2.4.7) with a white ring-offset.
 *   • Link target height ≥ 24px via py-1 + line-height (2.5.8).
 *   • Decorative separators are aria-hidden so SR users don't hear "·".
 */

import Link from "next/link";
import { useScholarLocale } from "../_i18n/LocaleProvider";
import { t } from "../_i18n/core";
import { FOOTER } from "../_i18n/footer";
import { SCHOLAR_TYPE } from "./scholar-type";

// Canonical legal slugs → labels. Order is the display order in the link row.
// hrefs are FIXED here (i18n only localises the visible label, never the path).
const LEGAL_LINKS: {
  href: string;
  labelKey: keyof (typeof FOOTER)["en"];
}[] = [
  { href: "/scholar/legal/privacy", labelKey: "privacy" },
  { href: "/scholar/legal/terms", labelKey: "terms" },
  { href: "/scholar/legal/acceptable-use", labelKey: "acceptableUse" },
  { href: "/scholar/legal/cookies", labelKey: "cookies" },
  { href: "/scholar/legal/sub-processors", labelKey: "subProcessors" },
  { href: "/scholar/legal/accessibility", labelKey: "accessibility" },
  { href: "/scholar/legal/imprint", labelKey: "imprint" },
];

export function ScholarFooter() {
  const locale = useScholarLocale();
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label={t(locale, FOOTER, "legalLinksLabel")}
      className="bg-white border-t border-gray-200 text-gray-900"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-8">
        {/* ── Legal-link row ── */}
        <nav aria-label={t(locale, FOOTER, "legalLinksLabel")}>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 list-none m-0 p-0">
            {LEGAL_LINKS.map(({ href, labelKey }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    SCHOLAR_TYPE.meta, // text-small / gray-600
                    "inline-flex items-center py-1 rounded",
                    "text-gray-600 hover:text-gray-900",
                    "motion-safe:transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                >
                  {t(locale, FOOTER, labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Not-legal-advice line ── */}
        <p className={`mt-5 ${SCHOLAR_TYPE.meta} text-gray-600`}>
          {t(locale, FOOTER, "notLegalAdvice")}
        </p>

        {/* ── Copyright + Atlas credit ── */}
        <p className={`mt-2 ${SCHOLAR_TYPE.meta} text-gray-500`}>
          <span>© {year} Caelex</span>
          <span aria-hidden="true" className="px-2 text-gray-400">
            ·
          </span>
          <span>{t(locale, FOOTER, "poweredByAtlas")}</span>
        </p>
      </div>
    </footer>
  );
}
