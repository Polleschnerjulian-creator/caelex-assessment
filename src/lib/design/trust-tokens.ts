/**
 * Trust-layer design tokens for the Context-Omnipresence system.
 *
 * Every derived value in Caelex carries one of five origins. The UI needs
 * to communicate that origin at a glance — color + icon + label combine
 * into a "Trust Chip" that tells operators and auditors instantly whether
 * they're looking at hard regulation, user input, or AI inference.
 *
 * Design rationale per origin:
 *   deterministic  → slate (neutral, authoritative, immutable)
 *   source-backed  → blue  (referential, calm, verifiable)
 *   assessment     → emerald (user-provided via structured flow; aligns with Caelex primary)
 *   user-asserted  → amber (manual entry, warrants scrutiny)
 *   ai-inferred    → violet (distinct AI affordance, "magic" but needs confirmation)
 *
 * Tailwind class tokens are plain strings (no arbitrary values) so they
 * stay purge-safe and get caught by the `content` scan in tailwind.config.
 *
 * Consumer flow:
 *   1. get origin from DerivationTrace.origin
 *   2. look up `TRUST_TOKENS[origin]`
 *   3. render via <ProvenanceChip /> or <CausalBreadcrumb />
 */

import type { LucideIcon } from "lucide-react";
import { Shield, FileText, ClipboardCheck, User, Sparkles } from "lucide-react";

// Re-export the origin union from the service for convenience.
// Keeping a local copy avoids pulling a "server-only" dep into client code.
export type TrustOrigin =
  | "deterministic"
  | "source-backed"
  | "assessment"
  | "user-asserted"
  | "ai-inferred";

export const ALL_TRUST_ORIGINS: readonly TrustOrigin[] = [
  "deterministic",
  "source-backed",
  "assessment",
  "user-asserted",
  "ai-inferred",
] as const;

/**
 * Tailwind class bundle for each origin. Structured so components can
 * compose them in any layout — chip, breadcrumb, side-peek, row highlight.
 *
 * All classes support both light mode (default) and dark mode (`dark:`
 * variants). Matches the project's dual-mode convention — marketing
 * pages run light, dashboard typically dark.
 */
export interface TrustColors {
  /** Chip background — subtle tint over page background. */
  chipBg: string;
  /** Chip border — stronger than bg, defines the pill edge. */
  chipBorder: string;
  /** Chip icon + label color — high contrast against chipBg. */
  chipText: string;
  /** Stronger accent used for the icon alone when the chip is compact. */
  iconAccent: string;
  /** Full-saturation color for inline breadcrumbs + connectors. */
  breadcrumbAccent: string;
}

/**
 * i18n key fragments per origin. Final keys are composed as
 * `provenance.origin_<origin_snake>` and `provenance.origin_<origin_snake>_desc`.
 * Kept here so the token is self-describing — you can render a chip from
 * just `TRUST_TOKENS[origin]` without touching i18n wiring.
 */
export interface TrustI18nKeys {
  /** Short label key — e.g. "provenance.origin_deterministic". */
  labelKey: string;
  /** One-line description key — e.g. "provenance.origin_deterministic_desc". */
  descriptionKey: string;
}

export interface TrustToken {
  origin: TrustOrigin;
  /** Lucide React icon component. */
  icon: LucideIcon;
  /** Single glyph used in <1em inline contexts where an icon won't fit. */
  glyph: string;
  colors: TrustColors;
  i18n: TrustI18nKeys;
  /** If true, UI should prompt the user to confirm — applies to ai-inferred
   *  (always) and user-asserted (when stale). Other origins do not prompt. */
  requiresConfirmation: boolean;
}

// ─── The tokens ─────────────────────────────────────────────────────────

export const TRUST_TOKENS: Record<TrustOrigin, TrustToken> = {
  deterministic: {
    origin: "deterministic",
    icon: Shield,
    glyph: "◆",
    colors: {
      chipBg: "bg-slate-100 dark:bg-slate-800/60",
      chipBorder: "border-slate-300 dark:border-slate-700",
      chipText: "text-slate-700 dark:text-slate-200",
      iconAccent: "text-slate-600 dark:text-slate-300",
      breadcrumbAccent: "text-slate-700 dark:text-slate-200",
    },
    i18n: {
      labelKey: "provenance.origin_deterministic",
      descriptionKey: "provenance.origin_deterministic_desc",
    },
    requiresConfirmation: false,
  },

  "source-backed": {
    origin: "source-backed",
    icon: FileText,
    glyph: "◇",
    colors: {
      chipBg: "bg-sky-50 dark:bg-sky-950/50",
      chipBorder: "border-sky-200 dark:border-sky-800",
      chipText: "text-sky-800 dark:text-sky-200",
      iconAccent: "text-sky-600 dark:text-sky-300",
      breadcrumbAccent: "text-sky-700 dark:text-sky-300",
    },
    i18n: {
      labelKey: "provenance.origin_source_backed",
      descriptionKey: "provenance.origin_source_backed_desc",
    },
    requiresConfirmation: false,
  },

  assessment: {
    origin: "assessment",
    icon: ClipboardCheck,
    glyph: "✓",
    colors: {
      chipBg: "bg-emerald-50 dark:bg-emerald-950/50",
      chipBorder: "border-emerald-200 dark:border-emerald-800",
      chipText: "text-emerald-800 dark:text-emerald-200",
      iconAccent: "text-emerald-600 dark:text-emerald-300",
      breadcrumbAccent: "text-emerald-700 dark:text-emerald-300",
    },
    i18n: {
      labelKey: "provenance.origin_assessment",
      descriptionKey: "provenance.origin_assessment_desc",
    },
    requiresConfirmation: false,
  },

  "user-asserted": {
    origin: "user-asserted",
    icon: User,
    glyph: "✱",
    colors: {
      chipBg: "bg-amber-50 dark:bg-amber-950/40",
      chipBorder: "border-amber-200 dark:border-amber-800",
      chipText: "text-amber-800 dark:text-amber-200",
      iconAccent: "text-amber-600 dark:text-amber-300",
      breadcrumbAccent: "text-amber-700 dark:text-amber-300",
    },
    i18n: {
      labelKey: "provenance.origin_user_asserted",
      descriptionKey: "provenance.origin_user_asserted_desc",
    },
    requiresConfirmation: false,
  },

  "ai-inferred": {
    origin: "ai-inferred",
    icon: Sparkles,
    glyph: "⚙",
    colors: {
      chipBg: "bg-violet-50 dark:bg-violet-950/40",
      chipBorder: "border-violet-200 dark:border-violet-800",
      chipText: "text-violet-800 dark:text-violet-200",
      iconAccent: "text-violet-600 dark:text-violet-300",
      breadcrumbAccent: "text-violet-700 dark:text-violet-300",
    },
    i18n: {
      labelKey: "provenance.origin_ai_inferred",
      descriptionKey: "provenance.origin_ai_inferred_desc",
    },
    requiresConfirmation: true,
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Safe accessor — falls back to `deterministic` for unknown inputs.
 * Useful when reading an origin string from an untrusted JSON payload
 * (e.g. an API response with future origin values the client doesn't
 * yet know about).
 */
export function getTrustToken(origin: string): TrustToken {
  if (origin in TRUST_TOKENS) {
    return TRUST_TOKENS[origin as TrustOrigin];
  }
  return TRUST_TOKENS.deterministic;
}

/**
 * Format a confidence value for display. AI-inferred traces expose
 * `confidence ∈ [0,1]`; humans read it better as "82%".
 * Returns `null` if confidence is missing — consumer hides the pill.
 */
export function formatConfidence(
  confidence: number | null | undefined,
): string | null {
  if (confidence === null || confidence === undefined) return null;
  if (confidence < 0 || confidence > 1) return null;
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Determine whether a trace is stale at the given moment.
 * `null` / `undefined` expiresAt means "does not expire" → never stale.
 */
export function isTraceStale(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry.getTime() < now.getTime();
}
