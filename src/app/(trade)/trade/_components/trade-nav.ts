/**
 * Caelex Trade — Navigation information architecture (pure data).
 *
 * Single source of truth for the two-column "Passage" shell:
 *
 *   - RAIL   → the slim black icon rail (top-level sections). Icon-only,
 *              rendered by TradeRail.tsx as <Link>s with a left indicator.
 *   - PANELS → the white contextual panel content, keyed by RAIL item key.
 *              Each section has a German title + grouped link rows, rendered
 *              by TradeContextPanel.tsx. Counts come from SidebarBadgeCounts
 *              via `badgeKey`; rows without a badgeKey show no count.
 *
 * This file is framework-agnostic data only — no JSX, no hooks — so it can
 * be imported by both the rail and the panel without pulling in client
 * runtime. Lucide icons are values (component references), which is fine in
 * a `.ts` module since we never render them here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  Home,
  Compass,
  Workflow,
  Boxes,
  ScanLine,
  FileText,
  FileCheck,
  Users,
  Sparkles,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

/** A top-level icon in the black rail. */
export interface RailItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Returns true when `pathname` belongs to this rail section. */
  match: (pathname: string) => boolean;
}

/** Soft-bg + saturated-icon status glyph variants (mockup `.g.*`). */
export type PanelGlyph =
  | "slate"
  | "amber"
  | "orange"
  | "green"
  | "red"
  | "indigo";

/** One link row inside the white contextual panel. */
export interface PanelItem {
  label: string;
  href: string;
  /** Optional lucide icon (drawn in the row's leading slot). */
  icon?: LucideIcon;
  /** Optional status glyph chip (soft-bg square) — takes the leading slot
   *  when `icon` is absent. */
  glyph?: PanelGlyph;
  /** Key into SidebarBadgeCounts → renders a tabular-num count on the right
   *  when > 0. Omit for rows that have no count. */
  badgeKey?: keyof SidebarBadgeCounts;
  /** Optional custom active-matcher. Defaults to href-prefix matching in the
   *  panel component. */
  match?: (pathname: string) => boolean;
}

/** A labelled group of rows (label optional → ungrouped lead block). */
export interface PanelGroup {
  label?: string;
  items: PanelItem[];
}

/** Full contextual panel for one rail section. */
export interface SectionPanel {
  title: string;
  groups: PanelGroup[];
}

/* ────────────────────────────────────────────────────────────────────────
 * RAIL — top-level icon rail (top → bottom). Footer items (settings,
 * program) are flagged via the consumer; here we keep one ordered list and
 * the rail component slots the footer group lower with a spacer.
 * ──────────────────────────────────────────────────────────────────────── */

/** Rail keys that render in the lower (footer) group of the rail. */
export const RAIL_FOOTER_KEYS: ReadonlySet<string> = new Set([
  "settings",
  "program",
]);

export const RAIL: ReadonlyArray<RailItem> = [
  {
    key: "home",
    href: "/trade",
    label: "Home",
    icon: Home,
    match: (p) => p === "/trade",
  },
  {
    key: "applicability",
    href: "/trade/applicability",
    label: "Geltungsbereich",
    icon: Compass,
    match: (p) => p.startsWith("/trade/applicability"),
  },
  {
    key: "operations",
    href: "/trade/operations",
    label: "Vorgänge",
    icon: Workflow,
    match: (p) => p.startsWith("/trade/operations"),
  },
  {
    key: "masterdata",
    href: "/trade/master-data",
    label: "Stammdaten",
    icon: Boxes,
    match: (p) =>
      p.startsWith("/trade/master-data") ||
      p.startsWith("/trade/items") ||
      p.startsWith("/trade/parties"),
  },
  {
    key: "screening",
    href: "/trade/screening",
    label: "Screening",
    icon: ScanLine,
    match: (p) => p.startsWith("/trade/screening"),
  },
  {
    key: "documents",
    href: "/trade/documents",
    label: "Dokumente",
    icon: FileText,
    match: (p) =>
      p.startsWith("/trade/documents") ||
      p.startsWith("/trade/euc") ||
      p.startsWith("/trade/vsd") ||
      p.startsWith("/trade/reexport-consents") ||
      p.startsWith("/trade/sammelgenehmigungen") ||
      p.startsWith("/trade/france-los") ||
      p.startsWith("/trade/uk-ecju") ||
      p.startsWith("/trade/faa-ast") ||
      p.startsWith("/trade/deemed-exports"),
  },
  {
    key: "astra",
    href: "/trade/astra",
    label: "Astra",
    icon: Sparkles,
    match: (p) => p.startsWith("/trade/astra"),
  },
  // ── Footer group (rendered lower in the rail) ──
  {
    key: "settings",
    href: "/trade/settings",
    label: "Einstellungen",
    icon: Settings,
    match: (p) =>
      p.startsWith("/trade/settings") || p.startsWith("/trade/research"),
  },
  {
    key: "program",
    href: "/trade/program",
    label: "Compliance-Programm",
    icon: ShieldCheck,
    match: (p) => p.startsWith("/trade/program"),
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * PANELS — contextual white panel per rail section (German titles).
 * All `items` are real links. Counts are wired through `badgeKey`; rows
 * without one render no count. Status/Regime "filter" rows all point at the
 * relevant list route (filtering UI is a later sprint — for now they read
 * as the taxonomy and navigate to the list).
 * ──────────────────────────────────────────────────────────────────────── */

export const PANELS: Record<string, SectionPanel> = {
  home: {
    title: "Start",
    groups: [
      {
        items: [
          { label: "Home", href: "/trade", icon: Home },
          {
            label: "Geltungsbereich",
            href: "/trade/applicability",
            icon: Compass,
          },
          { label: "Astra", href: "/trade/astra", icon: Sparkles },
        ],
      },
    ],
  },

  applicability: {
    title: "Geltungsbereich",
    groups: [
      {
        items: [
          {
            label: "Einordnung",
            href: "/trade/applicability",
            icon: Compass,
          },
        ],
      },
    ],
  },

  operations: {
    title: "Vorgänge",
    groups: [
      {
        items: [
          {
            label: "Alle",
            href: "/trade/operations",
            icon: Workflow,
            match: (p) => p === "/trade/operations",
          },
          {
            label: "Neuer Vorgang",
            href: "/trade/operations/new",
            icon: Sparkles,
          },
        ],
      },
      {
        label: "Status",
        items: [
          {
            label: "Entwurf",
            href: "/trade/operations?status=DRAFT",
            glyph: "slate",
          },
          {
            label: "Screening",
            href: "/trade/operations?status=SCREENING",
            glyph: "amber",
          },
          {
            label: "Lizenz nötig",
            href: "/trade/operations?status=AWAITING_LICENSE",
            glyph: "orange",
          },
          {
            label: "Freigegeben",
            href: "/trade/operations?status=LICENSED",
            glyph: "green",
          },
          {
            label: "Blockiert",
            href: "/trade/operations?status=BLOCKED",
            glyph: "red",
            badgeKey: "operationsBlocked",
          },
        ],
      },
      {
        label: "Regime",
        items: [
          { label: "EU Dual-Use", href: "/trade/operations", glyph: "indigo" },
          { label: "ITAR / EAR", href: "/trade/operations", glyph: "red" },
          { label: "BAFA national", href: "/trade/operations", glyph: "slate" },
        ],
      },
    ],
  },

  masterdata: {
    title: "Stammdaten",
    groups: [
      {
        items: [
          { label: "Artikel", href: "/trade/items", icon: Boxes },
          {
            label: "Partner",
            href: "/trade/parties",
            icon: ScanLine,
            badgeKey: "partiesNeedingReview",
          },
        ],
      },
    ],
  },

  screening: {
    title: "Screening",
    groups: [
      {
        items: [
          {
            label: "Queue",
            href: "/trade/screening",
            icon: ScanLine,
            badgeKey: "partiesNeedingReview",
          },
        ],
      },
    ],
  },

  documents: {
    title: "Dokumente",
    groups: [
      {
        items: [
          { label: "Übersicht", href: "/trade/documents", icon: FileText },
        ],
      },
      {
        label: "Typen",
        items: [
          {
            label: "EUC",
            href: "/trade/euc",
            glyph: "amber",
            badgeKey: "eucAwaitingAction",
          },
          {
            label: "Re-Export",
            href: "/trade/reexport-consents",
            glyph: "indigo",
          },
          { label: "VSD", href: "/trade/vsd", glyph: "orange" },
          {
            label: "Sammelgenehmigungen",
            href: "/trade/sammelgenehmigungen",
            glyph: "green",
          },
          { label: "France LOS", href: "/trade/france-los", glyph: "slate" },
          { label: "UK ECJU", href: "/trade/uk-ecju", glyph: "slate" },
          { label: "FAA AST", href: "/trade/faa-ast", glyph: "slate" },
          {
            label: "Deemed Exports",
            href: "/trade/deemed-exports",
            glyph: "slate",
          },
        ],
      },
    ],
  },

  astra: {
    title: "Astra",
    groups: [
      {
        items: [{ label: "Astra", href: "/trade/astra", icon: Sparkles }],
      },
    ],
  },

  settings: {
    title: "Einstellungen",
    groups: [
      {
        items: [
          { label: "Einstellungen", href: "/trade/settings", icon: Settings },
          {
            label: "Training Corpus",
            href: "/trade/research/training-corpus",
            icon: FileText,
          },
        ],
      },
    ],
  },

  program: {
    title: "Compliance-Programm",
    groups: [
      {
        items: [
          { label: "Programm", href: "/trade/program", icon: ShieldCheck },
        ],
      },
    ],
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * SIDEBAR — flat, sectioned single-sidebar nav (Neon-console shell).
 * Replaces the rail+panel master-detail with one always-visible sidebar
 * (icons + labels, grouped by area), like Neon's PROJECT / BRANCH / APP
 * BACKEND. Rendered by TradeSidebarNav.tsx.
 * ──────────────────────────────────────────────────────────────────────── */

/** One icon+label row in the flat sidebar. */
export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  /** Optional attention count key → renders a small badge when > 0. */
  badgeKey?: keyof SidebarBadgeCounts;
}

/** A labelled group of sidebar rows. */
export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export const SIDEBAR_GROUPS: ReadonlyArray<SidebarNavGroup> = [
  {
    label: "Start",
    items: [
      {
        label: "Home",
        href: "/trade",
        icon: Home,
        match: (p) => p === "/trade",
      },
      {
        label: "Geltungsbereich",
        href: "/trade/applicability",
        icon: Compass,
        match: (p) => p.startsWith("/trade/applicability"),
      },
      {
        label: "Astra",
        href: "/trade/astra",
        icon: Sparkles,
        match: (p) => p.startsWith("/trade/astra"),
      },
    ],
  },
  {
    label: "Arbeit",
    items: [
      {
        label: "Vorgänge",
        href: "/trade/operations",
        icon: Workflow,
        match: (p) => p.startsWith("/trade/operations"),
        badgeKey: "operationsBlocked",
      },
      {
        label: "Datenblatt prüfen",
        href: "/trade/assess",
        icon: FileText,
        match: (p) => p.startsWith("/trade/assess"),
      },
      {
        label: "Screening",
        href: "/trade/screening",
        icon: ScanLine,
        match: (p) => p.startsWith("/trade/screening"),
        badgeKey: "partiesNeedingReview",
      },
    ],
  },
  {
    label: "Stammdaten",
    items: [
      {
        label: "Artikel",
        href: "/trade/items",
        icon: Boxes,
        match: (p) =>
          p.startsWith("/trade/items") || p.startsWith("/trade/master-data"),
      },
      {
        label: "Partner",
        href: "/trade/parties",
        icon: Users,
        match: (p) => p.startsWith("/trade/parties"),
        badgeKey: "partiesNeedingReview",
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        label: "Lizenzen",
        href: "/trade/licenses",
        icon: FileCheck,
        match: (p) => p.startsWith("/trade/licenses"),
      },
      {
        label: "Dokumente",
        href: "/trade/documents",
        icon: FileText,
        match: (p) =>
          p.startsWith("/trade/documents") ||
          p.startsWith("/trade/euc") ||
          p.startsWith("/trade/vsd") ||
          p.startsWith("/trade/reexport-consents") ||
          p.startsWith("/trade/sammelgenehmigungen") ||
          p.startsWith("/trade/france-los") ||
          p.startsWith("/trade/uk-ecju") ||
          p.startsWith("/trade/faa-ast") ||
          p.startsWith("/trade/deemed-exports"),
      },
    ],
  },
];

/** Bottom-pinned sidebar rows (settings, programme). */
export const SIDEBAR_FOOTER: ReadonlyArray<SidebarNavItem> = [
  {
    label: "Compliance-Programm",
    href: "/trade/program",
    icon: ShieldCheck,
    match: (p) => p.startsWith("/trade/program"),
  },
  {
    label: "Einstellungen",
    href: "/trade/settings",
    icon: Settings,
    match: (p) =>
      p.startsWith("/trade/settings") || p.startsWith("/trade/research"),
  },
];

/** Active sidebar item's label for a pathname (top-bar breadcrumb tail). */
export function activeNavLabel(pathname: string): string | null {
  for (const g of SIDEBAR_GROUPS) {
    for (const it of g.items) if (it.match(pathname)) return it.label;
  }
  for (const it of SIDEBAR_FOOTER) if (it.match(pathname)) return it.label;
  return null;
}

/**
 * Resolve the active rail key for a pathname — first RAIL item whose
 * `match()` hits, falling back to "home". Used by both the rail (active
 * indicator) and the panel (which section's content to render).
 */
export function activeRailKey(pathname: string): string {
  for (const item of RAIL) {
    if (item.match(pathname)) return item.key;
  }
  return "home";
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
