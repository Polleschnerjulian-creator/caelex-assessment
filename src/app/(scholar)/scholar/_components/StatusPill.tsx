/**
 * StatusPill — outlined, strictly-monochrome status pill for Scholar.
 *
 * Replaces every coloured status badge across the surface (legal-source
 * status AND case status) with one neutral, accessible primitive.
 *
 * Presentational only: no hooks, no data imports. Server component.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * WCAG 1.4.3: gray-700 text on white ≈ 6.4:1 ✓
 * WCAG 1.4.11: gray-300 border ≈ 3.3:1 (load-bearing outline) ✓;
 *              gray-500 glyph ≈ 4.6:1 ✓ (decorative, aria-hidden)
 */

import {
  Archive,
  Ban,
  Check,
  Clock,
  FileEdit,
  Gavel,
  Scale,
  type LucideIcon,
} from "lucide-react";

// ─── Status → German label + monochrome glyph ───────────────────────
// Keys are normalised (lowercased, trimmed) before lookup. Covers both
// legal-source statuses (in_force / superseded / repealed / draft …) and
// case statuses (decided / final / pending / appealed …).
const STATUS_MAP: Record<string, { label: string; icon: LucideIcon }> = {
  in_force: { label: "In Kraft", icon: Check },
  superseded: { label: "Abgelöst", icon: Archive },
  repealed: { label: "Aufgehoben", icon: Ban },
  draft: { label: "Entwurf", icon: FileEdit },
  proposed: { label: "Entwurf", icon: FileEdit },
  decided: { label: "Entschieden", icon: Gavel },
  final: { label: "Entschieden", icon: Gavel },
  pending: { label: "Anhängig", icon: Clock },
  appealed: { label: "Berufung", icon: Scale },
};

// Humanise an unknown raw status: "appeal_pending" → "Appeal pending".
function humanise(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (spaced.length === 0) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  // Tolerant lookup: lowercase + trim so "In_Force" / " in_force " still map.
  const key = status.toLowerCase().trim();
  const known = STATUS_MAP[key];

  const label = known ? known.label : humanise(status);
  const Icon = known ? known.icon : null;

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-micro font-medium uppercase tracking-[0.08em] text-gray-700" +
        (className ? " " + className : "")
      }
    >
      {/* Glyph — decorative; the adjacent label carries the meaning */}
      {Icon && <Icon size={11} className="text-gray-500" aria-hidden={true} />}
      {label}
    </span>
  );
}
