import type { ActionItem } from "@/lib/trade/action-inbox-aggregator";

/** Counts that decide onboarding vs cockpit. */
export interface TradeDataCounts {
  items: number;
  parties: number;
  operations: number;
}

export interface HeroCta {
  label: string;
  href: string;
}

export type HeroState =
  | { variant: "onboarding" }
  | { variant: "all-clear"; title: string; subtitle: string; cta: HeroCta }
  | {
      variant: "action";
      severity: ActionItem["severity"];
      title: string;
      subtitle: string;
      cta: HeroCta;
    };

const LIST_HREF_BY_KIND: Record<ActionItem["kind"], string> = {
  "operation-blocked": "/trade/operations",
  "license-expiring": "/trade/licenses",
  "euc-awaiting": "/trade/euc",
  "party-needs-screening": "/trade/parties",
  "vsd-deadline-approaching": "/trade/vsd",
  "vsd-needs-investigation": "/trade/vsd",
  "sag-utilization-high": "/trade/sammelgenehmigungen",
};

/**
 * Select the single "next action" for the Home hero.
 *  - no data at all → onboarding
 *  - data but no actions → all-clear (push to create the next operation)
 *  - actions present → the head of the already-severity-sorted list, OR a
 *    confirm-batch headline when ≥2 items share the top item's kind+severity.
 * Pure: no I/O.
 */
export function pickHeroAction(
  items: ReadonlyArray<ActionItem>,
  counts: TradeDataCounts,
): HeroState {
  if (items.length === 0) {
    const hasData =
      counts.items > 0 || counts.parties > 0 || counts.operations > 0;
    if (!hasData) return { variant: "onboarding" };
    return {
      variant: "all-clear",
      title: "Alles erledigt 🎉",
      subtitle: "Keine offenen Punkte. Starte den nächsten Ausfuhrvorgang.",
      cta: {
        label: "Darf ich liefern? — Vorgang prüfen",
        href: "/trade/operations/new",
      },
    };
  }

  // Sort by severity so this function is robust even when the caller passes
  // an unsorted slice (the aggregator normally pre-sorts, but tests may not).
  const SEVERITY_RANK: Record<ActionItem["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const sorted = [...items].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
  const head = sorted[0];
  const sameBucket = sorted.filter(
    (i) => i.kind === head.kind && i.severity === head.severity,
  );

  if (sameBucket.length >= 2) {
    return {
      variant: "action",
      severity: head.severity,
      title: `${sameBucket.length} Punkte: ${headlineForKind(head.kind)}`,
      subtitle: "Automatisch vorbereitet — du bestätigst nur.",
      cta: { label: "Alle ansehen", href: LIST_HREF_BY_KIND[head.kind] },
    };
  }

  return {
    variant: "action",
    severity: head.severity,
    title: head.title,
    subtitle: head.subtitle ?? "Automatisch vorbereitet — du bestätigst nur.",
    cta: { label: "Öffnen", href: head.href },
  };
}

function headlineForKind(kind: ActionItem["kind"]): string {
  switch (kind) {
    case "operation-blocked":
      return "Vorgänge brauchen Aufmerksamkeit";
    case "license-expiring":
      return "Lizenzen laufen ab";
    case "euc-awaiting":
      return "End-Use-Certificates offen";
    case "party-needs-screening":
      return "Partner prüfen";
    case "vsd-deadline-approaching":
      return "VSD-Fristen nahen";
    case "vsd-needs-investigation":
      return "VSDs zu untersuchen";
    case "sag-utilization-high":
      return "Sammelgenehmigungen fast ausgeschöpft";
  }
}
