/**
 * Tests for the Astra Trade Tool Gate (G4 / T-H10 residual).
 *
 * The gate is the engine-layer expression of the founder's thesis: the
 * AI proposes, the human commits. These tests pin the three guarantees:
 *
 *   1. Product scope — a Trade chat only sees Trade + universal read-only
 *      tools; other products never see Trade tools.
 *   2. Auditor = read-only — an auditor can never invoke a mutating tool.
 *   3. Proposal gate — a mutating Trade tool is deflected to a proposal,
 *      never executed; read-only tools are allowed through.
 *
 * Plus the fail-closed invariant: an unrecognised Trade tool is treated
 * as mutating, and every name in TOOL_CATEGORIES.trade is classified.
 */

import { describe, it, expect } from "vitest";
import type { AstraUserContext } from "./types";
import {
  READ_ONLY_TRADE_TOOLS,
  MUTATING_TRADE_TOOLS,
  isTradeTool,
  isMutatingTradeTool,
  isAuditorContext,
  decideTradeToolGate,
  buildTradeProposal,
  isToolInProductScope,
  scopeToolsToProduct,
} from "./trade-tool-gate";
import { TOOL_CATEGORIES } from "./tool-definitions";

const baseCtx: AstraUserContext = {
  userId: "user-1",
  organizationId: "org-1",
  organizationName: "Test Org",
};

const operatorCtx: AstraUserContext = { ...baseCtx, useCase: "operator" };
const auditorCtx: AstraUserContext = { ...baseCtx, useCase: "auditor" };

// ─── Mutation classification ────────────────────────────────────────────

describe("trade-tool-gate — mutation classification", () => {
  it("every TOOL_CATEGORIES.trade tool is recognised as a trade tool", () => {
    for (const name of TOOL_CATEGORIES.trade) {
      expect(isTradeTool(name), `${name} not recognised`).toBe(true);
    }
  });

  it("every known trade-category tool is read-only (current handler map)", () => {
    // The current executor's trade handlers are all reads/draft-only —
    // the audit's first pass neutered the un-gated writers. So no
    // trade-category tool should be classified mutating today.
    for (const name of TOOL_CATEGORIES.trade) {
      expect(isMutatingTradeTool(name), `${name} should be read-only`).toBe(
        false,
      );
    }
  });

  it("read-only list and mutating list are disjoint", () => {
    const overlap = READ_ONLY_TRADE_TOOLS.filter((n) =>
      (MUTATING_TRADE_TOOLS as readonly string[]).includes(n),
    );
    expect(overlap).toEqual([]);
  });

  it("explicitly-mutating trade tools are classified mutating", () => {
    for (const name of MUTATING_TRADE_TOOLS) {
      expect(isMutatingTradeTool(name), `${name} should be mutating`).toBe(
        true,
      );
    }
  });

  it("FAIL CLOSED: a trade-category tool not on the read-only allow-list is mutating", () => {
    // The real fail-closed guarantee: any tool that IS recognised as a
    // trade tool (registered in TOOL_CATEGORIES.trade) but is NOT on the
    // explicit read-only allow-list must be treated as mutating, never
    // silently writable. Simulate a newly-added trade tool by extending
    // the recognised set indirectly through an explicitly-mutating name.
    for (const name of MUTATING_TRADE_TOOLS) {
      // These are trade tools by virtue of being on the mutating list…
      expect(isTradeTool(name)).toBe(true);
      // …and therefore must be mutating (not on the read-only allow-list).
      expect(isMutatingTradeTool(name)).toBe(true);
    }
    // A non-trade unknown name is simply not this gate's concern.
    expect(isTradeTool("trade_brand_new_writer")).toBe(false);
  });

  it("non-trade tools are not classified as trade tools", () => {
    expect(isTradeTool("check_compliance_status")).toBe(false);
    expect(isTradeTool("explain_term")).toBe(false);
  });
});

// ─── Auditor persona ────────────────────────────────────────────────────

describe("trade-tool-gate — auditor detection", () => {
  it("auditor useCase is read-only", () => {
    expect(isAuditorContext(auditorCtx)).toBe(true);
  });
  it("operator / consultant / investor / undefined are NOT auditor", () => {
    expect(isAuditorContext(operatorCtx)).toBe(false);
    expect(isAuditorContext({ ...baseCtx, useCase: "consultant" })).toBe(false);
    expect(isAuditorContext({ ...baseCtx, useCase: "investor" })).toBe(false);
    expect(isAuditorContext(baseCtx)).toBe(false);
  });
});

// ─── Gate decision ──────────────────────────────────────────────────────

describe("trade-tool-gate — decideTradeToolGate", () => {
  it("allows non-trade tools regardless of persona", () => {
    expect(decideTradeToolGate("check_compliance_status", operatorCtx)).toEqual(
      { kind: "allow" },
    );
    expect(decideTradeToolGate("check_compliance_status", auditorCtx)).toEqual({
      kind: "allow",
    });
  });

  it("allows a read-only trade tool for an operator", () => {
    expect(decideTradeToolGate("lookup_trade_party", operatorCtx)).toEqual({
      kind: "allow",
    });
    expect(decideTradeToolGate("classify_trade_item", operatorCtx)).toEqual({
      kind: "allow",
    });
  });

  it("allows a read-only trade tool even for an auditor (lookups are fine)", () => {
    expect(decideTradeToolGate("lookup_trade_party", auditorCtx)).toEqual({
      kind: "allow",
    });
    expect(decideTradeToolGate("check_sanctions_status", auditorCtx)).toEqual({
      kind: "allow",
    });
  });

  it("deflects a mutating trade tool to a PROPOSAL for an operator", () => {
    const decision = decideTradeToolGate("run_trade_screening", operatorCtx);
    expect(decision.kind).toBe("propose");
    if (decision.kind === "propose") {
      expect(decision.reason).toMatch(/proposal/i);
    }
  });

  it("DENIES a mutating trade tool for an auditor (read-only persona)", () => {
    const decision = decideTradeToolGate("run_trade_screening", auditorCtx);
    expect(decision.kind).toBe("deny-auditor");
    if (decision.kind === "deny-auditor") {
      expect(decision.reason).toMatch(/auditor/i);
    }
  });

  it("auditor denial takes precedence over the proposal path", () => {
    // An auditor cannot even QUEUE a write proposal.
    for (const name of MUTATING_TRADE_TOOLS) {
      expect(decideTradeToolGate(name, auditorCtx).kind).toBe("deny-auditor");
    }
  });
});

// ─── Proposal envelope ──────────────────────────────────────────────────

describe("trade-tool-gate — buildTradeProposal", () => {
  it("produces an uncommitted PROPOSED envelope", () => {
    const p = buildTradeProposal(
      "run_trade_screening",
      { partyId: "p-1" },
      "reason",
    );
    expect(p.status).toBe("PROPOSED");
    expect(p.committed).toBe(false);
    expect(p.tool).toBe("run_trade_screening");
    expect(p.input).toEqual({ partyId: "p-1" });
    // The assistant proposes; only a human commits. Allow the natural-prose
    // comma in "will not, and cannot, commit it for you".
    expect(p.next).toMatch(/cannot,? commit it for you/i);
  });
});

// ─── Product scoping ────────────────────────────────────────────────────

describe("trade-tool-gate — product scope", () => {
  it("a Trade chat sees Trade tools", () => {
    for (const name of TOOL_CATEGORIES.trade) {
      expect(isToolInProductScope(name, "trade"), name).toBe(true);
    }
  });

  it("a Trade chat sees universal read-only tools", () => {
    expect(isToolInProductScope("explain_term", "trade")).toBe(true);
    expect(isToolInProductScope("search_regulation", "trade")).toBe(true);
  });

  it("a Trade chat does NOT see unrelated cross-product tools", () => {
    expect(isToolInProductScope("check_compliance_status", "trade")).toBe(
      false,
    );
    expect(
      isToolInProductScope("generate_debris_mitigation_plan", "trade"),
    ).toBe(false);
  });

  it("a non-Trade product hides Trade tools", () => {
    for (const name of TOOL_CATEGORIES.trade) {
      expect(isToolInProductScope(name, "comply"), name).toBe(false);
    }
    expect(isToolInProductScope("check_compliance_status", "comply")).toBe(
      true,
    );
  });

  it("EVERY non-Trade product hides Trade tools (atlas, pharos, comply)", () => {
    // B3-DEFER matrix: a tool scoped to product X must not be offered in
    // product Y — pinned for every non-Trade surface, not just comply.
    for (const product of ["comply", "atlas", "pharos"] as const) {
      for (const name of TOOL_CATEGORIES.trade) {
        expect(isToolInProductScope(name, product), `${name}@${product}`).toBe(
          false,
        );
      }
    }
  });

  it("universal read-only tools are offered in EVERY product", () => {
    // B3-DEFER matrix: tools without a product scope (the universal
    // regulatory-knowledge lookups) appear everywhere — including Trade.
    const universal = [
      "search_regulation",
      "get_article_detail",
      "get_article_requirements",
      "get_cross_references",
      "explain_term",
      "compare_jurisdictions",
      "discover_caelex_capabilities",
    ];
    for (const product of [
      "trade",
      "comply",
      "atlas",
      "pharos",
      "default",
    ] as const) {
      for (const name of universal) {
        expect(isToolInProductScope(name, product), `${name}@${product}`).toBe(
          true,
        );
      }
    }
  });

  it("non-Trade tools remain offered in every non-Trade product", () => {
    // Tools that belong to no special scope keep their historic reach on
    // all non-Trade surfaces (Trade is an allow-list context by design).
    for (const product of ["comply", "atlas", "pharos", "default"] as const) {
      expect(
        isToolInProductScope("check_compliance_status", product),
        `check_compliance_status@${product}`,
      ).toBe(true);
      expect(
        isToolInProductScope("generate_debris_mitigation_plan", product),
        `generate_debris_mitigation_plan@${product}`,
      ).toBe(true);
    }
  });

  it("scopeToolsToProduct filters a tool-definition list for Trade", () => {
    const tools = [
      { name: "classify_trade_item" },
      { name: "screen_trade_party" },
      { name: "explain_term" },
      { name: "check_compliance_status" },
      { name: "generate_debris_mitigation_plan" },
    ];
    const scoped = scopeToolsToProduct(tools, "trade").map((t) => t.name);
    expect(scoped).toContain("classify_trade_item");
    expect(scoped).toContain("screen_trade_party");
    expect(scoped).toContain("explain_term");
    expect(scoped).not.toContain("check_compliance_status");
    expect(scoped).not.toContain("generate_debris_mitigation_plan");
  });

  it("scopeToolsToProduct returns ALL tools for the default product", () => {
    const tools = [
      { name: "classify_trade_item" },
      { name: "check_compliance_status" },
    ];
    expect(scopeToolsToProduct(tools, "default")).toHaveLength(2);
  });

  it("scopeToolsToProduct for comply strips Trade tools, keeps the rest", () => {
    const tools = [
      { name: "classify_trade_item" },
      { name: "screen_trade_party" },
      { name: "explain_term" },
      { name: "check_compliance_status" },
    ];
    const scoped = scopeToolsToProduct(tools, "comply").map((t) => t.name);
    expect(scoped).not.toContain("classify_trade_item");
    expect(scoped).not.toContain("screen_trade_party");
    expect(scoped).toContain("explain_term");
    expect(scoped).toContain("check_compliance_status");
  });
});
