/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * L-14: shared TYPE_STYLES table for legal-source badges. Previously
 * duplicated across sources/[id]/page.tsx and jurisdictions/[code]/
 * page.tsx with two slightly-divergent palettes — adding a new
 * `LegalSourceType` enum value silently broke either page that
 * forgot to extend its local copy.
 *
 * Single source of truth lives here. If you need a page-specific
 * variant, override individual entries via spread:
 *
 *     const PAGE_TYPE_STYLES = {
 *       ...LEGAL_SOURCE_TYPE_STYLES,
 *       international_treaty: { bg: "...", text: "..." },
 *     };
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSourceType } from "@/data/legal-sources";

export interface LegalSourceTypeStyle {
  bg: string;
  text: string;
}

export const LEGAL_SOURCE_TYPE_STYLES: Record<
  LegalSourceType,
  LegalSourceTypeStyle
> = {
  international_treaty: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  federal_law: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  federal_regulation: {
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-700",
  },
  technical_standard: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  eu_regulation: {
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
  },
  eu_directive: {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  policy_document: {
    bg: "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)]",
    text: "text-[var(--atlas-text-secondary)]",
  },
  draft_legislation: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
};
