import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Caelex Passage — Settings secondary sub-nav (Neon hub).
 *
 * Vertical, sectioned sub-nav (like Vercel/Neon settings) that scales to
 * the full settings IA. Internal items link to `/trade/settings?tab=…`
 * (shareable URL, server-rendered active state). External items (`↗`) link
 * out to a separate surface (e.g. the Compliance-Programm dashboard) instead
 * of duplicating it here.
 *
 * Sections grow as later phases land (Screening, Fristen, Team, Webhooks,
 * Widget, Daten …). Only built sections are listed — no dead placeholders.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type TabKey =
  | "profile"
  | "screening"
  | "notifications"
  | "api-keys"
  | "audit"
  | "appearance";

type NavItem =
  | { tab: TabKey; label: string }
  | { href: string; label: string; external: true };

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: "Organisation",
    items: [
      { tab: "profile", label: "Stammdaten" },
      {
        href: "/trade/program",
        label: "Compliance-Programm",
        external: true,
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      { tab: "screening", label: "Screening" },
      { tab: "notifications", label: "Benachrichtigungen" },
    ],
  },
  {
    label: "Entwickler",
    items: [{ tab: "api-keys", label: "API-Keys" }],
  },
  {
    label: "Konto",
    items: [{ tab: "audit", label: "Audit-Trail" }],
  },
  {
    label: "Darstellung",
    items: [{ tab: "appearance", label: "Darstellung" }],
  },
];

export function SettingsSubNav({ active }: { active: TabKey }) {
  return (
    <nav
      aria-label="Einstellungen"
      className="w-[212px] shrink-0 lg:sticky lg:top-[72px]"
    >
      {SECTIONS.map((section) => (
        <div key={section.label} className="mb-3.5">
          <div className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-trade-text-muted">
            {section.label}
          </div>
          {section.items.map((item) =>
            "external" in item ? (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-trade-text-muted" />
              </Link>
            ) : (
              <Link
                key={item.tab}
                href={`/trade/settings?tab=${item.tab}`}
                aria-current={item.tab === active ? "page" : undefined}
                className={`block rounded-lg px-2.5 py-2 text-[13px] transition ${
                  item.tab === active
                    ? "bg-trade-bg-subtle font-medium text-trade-text-primary"
                    : "text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
