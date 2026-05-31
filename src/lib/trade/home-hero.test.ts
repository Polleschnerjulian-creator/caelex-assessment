import { describe, it, expect } from "vitest";
import { pickHeroAction, type HeroState } from "./home-hero";
import type { ActionItem } from "@/lib/trade/action-inbox-aggregator";

function item(over: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "operation-blocked:op1",
    kind: "operation-blocked",
    severity: "critical",
    title: "Vorgang AV-CN-7F blockiert",
    href: "/trade/operations/op1",
    ...over,
  };
}
const emptyCounts = { items: 0, parties: 0, operations: 0 };
const someCounts = { items: 5, parties: 3, operations: 2 };

describe("pickHeroAction", () => {
  it("returns onboarding when the workspace has no data", () => {
    const r = pickHeroAction([], emptyCounts);
    expect(r.variant).toBe("onboarding");
  });

  it("returns all-clear with a New-Vorgang CTA when there is data but no actions", () => {
    const r = pickHeroAction([], someCounts);
    expect(r.variant).toBe("all-clear");
    expect((r as Extract<HeroState, { variant: "all-clear" }>).cta.href).toBe(
      "/trade/operations/new",
    );
  });

  it("surfaces the single most-critical action as the hero", () => {
    const items = [
      item({
        id: "license-expiring:l1",
        kind: "license-expiring",
        severity: "warning",
        title: "Lizenz läuft ab",
        href: "/trade/licenses/l1",
      }),
      item({
        id: "operation-blocked:op1",
        severity: "critical",
        title: "Vorgang blockiert",
        href: "/trade/operations/op1",
      }),
    ];
    const r = pickHeroAction(items, someCounts);
    expect(r.variant).toBe("action");
    const a = r as Extract<HeroState, { variant: "action" }>;
    expect(a.title).toBe("Vorgang blockiert");
    expect(a.cta.href).toBe("/trade/operations/op1");
  });

  it("batches when several criticals of the same kind exist (confirm-batch headline)", () => {
    const items = [
      item({ id: "operation-blocked:op1", href: "/trade/operations/op1" }),
      item({ id: "operation-blocked:op2", href: "/trade/operations/op2" }),
      item({ id: "operation-blocked:op3", href: "/trade/operations/op3" }),
    ];
    const r = pickHeroAction(items, someCounts);
    expect(r.variant).toBe("action");
    const a = r as Extract<HeroState, { variant: "action" }>;
    expect(a.title).toMatch(/3/);
    expect(a.cta.href).toBe("/trade/operations");
  });

  it("prefers the head of the already-sorted list when kinds differ", () => {
    const items = [
      item({
        id: "operation-blocked:opA",
        title: "A",
        href: "/trade/operations/opA",
      }),
      item({
        id: "party-needs-screening:p1",
        kind: "party-needs-screening",
        severity: "critical",
        title: "B",
        href: "/trade/parties/p1",
      }),
    ];
    const r = pickHeroAction(items, someCounts);
    const a = r as Extract<HeroState, { variant: "action" }>;
    expect(a.title).toBe("A");
  });
});
