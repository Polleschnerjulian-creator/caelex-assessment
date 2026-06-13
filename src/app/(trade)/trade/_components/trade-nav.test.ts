/**
 * Caelex Trade — live-nav reachability tests for trade-nav.ts.
 *
 * Guards the Task-7 invariant that `/trade/assess` ("Datenblatt prüfen") is
 * reachable from the LIVE Passage sidebar. The live shell renders
 * TradeShell → TradeSidebarNav, which reads SIDEBAR_GROUPS + SIDEBAR_FOOTER
 * (NOT the legacy RAIL/PANELS master-detail, which has no importer). An entry
 * that lives only in PANELS is dead code, so we assert against the arrays the
 * rendered sidebar actually consumes.
 *
 * Pure-data tests: no JSDOM, no component render — just the nav data module.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  SIDEBAR_GROUPS,
  SIDEBAR_FOOTER,
  activeNavLabel,
  type SidebarNavItem,
} from "./trade-nav";

/** Every row the rendered TradeSidebarNav iterates over (groups + footer). */
const liveSidebarItems: SidebarNavItem[] = [
  ...SIDEBAR_GROUPS.flatMap((g) => g.items),
  ...SIDEBAR_FOOTER,
];

describe("trade-nav — live sidebar reachability for /trade/assess", () => {
  it("exposes a /trade/assess entry in the LIVE sidebar (SIDEBAR_GROUPS), not just legacy PANELS", () => {
    const assess = liveSidebarItems.find((it) => it.href === "/trade/assess");
    expect(assess).toBeDefined();
    expect(assess?.label).toBe("Datenblatt prüfen");
  });

  it("activates the assess entry on /trade/assess and its subpaths", () => {
    const assess = liveSidebarItems.find((it) => it.href === "/trade/assess");
    expect(assess?.match("/trade/assess")).toBe(true);
    expect(assess?.match("/trade/assess/result")).toBe(true);
  });

  it("does not let the assess entry hijack the operations route", () => {
    const assess = liveSidebarItems.find((it) => it.href === "/trade/assess");
    expect(assess?.match("/trade/operations")).toBe(false);
    expect(assess?.match("/trade/screening")).toBe(false);
  });

  it("resolves the assess breadcrumb tail via activeNavLabel", () => {
    expect(activeNavLabel("/trade/assess")).toBe("Datenblatt prüfen");
  });
});
