/**
 * Step factories — unit tests.
 *
 * Each factory must:
 *   1. Produce a StoredStep with the right `kind` discriminator
 *   2. Carry the operator-supplied config through to the stored half
 *   3. Carry handler closures through to the handlers half
 *   4. Reject obviously-broken configs (empty requireRoles, missing
 *      promptTemplate, etc.)
 */

import { describe, it, expect, vi } from "vitest";
import { step } from "./steps";

describe("step.action", () => {
  it("produces a StoredActionStep with kind=action and autoFireOnEnter default true", () => {
    const handle = step.action({
      key: "my-action",
      from: "A",
      to: "B",
      run: vi.fn(),
    });
    expect(handle.stored.kind).toBe("action");
    expect(handle.stored.key).toBe("my-action");
    expect(handle.stored.from).toBe("A");
    expect(handle.stored.to).toBe("B");
    expect(handle.stored.autoFireOnEnter).toBe(true);
    expect(handle.handlers.run).toBeTypeOf("function");
  });

  it("preserves uiLabel and uiHint", () => {
    const handle = step.action({
      key: "x",
      from: "A",
      to: "B",
      run: () => undefined,
      uiLabel: "Do thing",
      uiHint: "It's a thing",
    });
    expect(handle.stored.uiLabel).toBe("Do thing");
    expect(handle.stored.uiHint).toBe("It's a thing");
  });

  it("respects autoFireOnEnter:false override", () => {
    const handle = step.action({
      key: "x",
      from: "A",
      to: "B",
      run: () => undefined,
      autoFireOnEnter: false,
    });
    expect(handle.stored.autoFireOnEnter).toBe(false);
  });
});

describe("step.form", () => {
  it("produces kind=form with autoFireOnEnter=false (operator-driven)", () => {
    const handle = step.form({
      key: "f",
      from: "A",
      to: "B",
      requireRoles: ["OPERATOR"],
    });
    expect(handle.stored.kind).toBe("form");
    expect(handle.stored.autoFireOnEnter).toBe(false);
    expect(handle.stored.requireRoles).toEqual(["OPERATOR"]);
  });

  it("preserves the JSON-Schema validator and validate handler", () => {
    const validator = vi.fn();
    const handle = step.form({
      key: "f",
      from: "A",
      to: "B",
      schema: { type: "object", properties: { x: { type: "string" } } },
      validate: validator,
    });
    expect(handle.stored.schema).toBeDefined();
    expect(handle.handlers.validate).toBe(validator);
  });
});

describe("step.approval", () => {
  it("produces kind=approval with required-roles preserved", () => {
    const handle = step.approval({
      key: "ap",
      from: "A",
      to: "B",
      requireRoles: ["OPERATOR", "CISO"],
      qesRequired: true,
    });
    expect(handle.stored.kind).toBe("approval");
    expect(handle.stored.requireRoles).toEqual(["OPERATOR", "CISO"]);
    expect(handle.stored.qesRequired).toBe(true);
  });

  it("rejects empty requireRoles", () => {
    expect(() =>
      step.approval({
        key: "ap",
        from: "A",
        to: "B",
        requireRoles: [],
      }),
    ).toThrow(/requireRoles/);
  });

  it("preserves slaBy and escalations", () => {
    const handle = step.approval({
      key: "ap",
      from: "A",
      to: "B",
      requireRoles: ["OPERATOR"],
      slaBy: { offsetFromState: "DETECTED", hours: 24 },
      escalations: [{ atOffsetHours: 20, action: "notify-cto" }],
    });
    expect(handle.stored.slaBy).toEqual({
      offsetFromState: "DETECTED",
      hours: 24,
    });
    expect(handle.stored.escalations).toHaveLength(1);
  });
});

describe("step.astra", () => {
  it("produces kind=astra with default citations + maxLoops", () => {
    const handle = step.astra({
      key: "ast",
      from: "A",
      to: "B",
      promptTemplate: "explain-posture-drift",
    });
    expect(handle.stored.kind).toBe("astra");
    expect(handle.stored.promptTemplate).toBe("explain-posture-drift");
    expect(handle.stored.requiredCitations).toBe(true); // default
    expect(handle.stored.maxLoops).toBe(5); // default
  });

  it("rejects missing promptTemplate", () => {
    expect(() =>
      step.astra({
        key: "ast",
        from: "A",
        to: "B",
        promptTemplate: "",
      }),
    ).toThrow(/promptTemplate/);
  });
});

describe("step.waitForEvent", () => {
  it("produces kind=waitForEvent with autoFireOnEnter=false", () => {
    const handle = step.waitForEvent({
      key: "w",
      from: "A",
      to: "B",
      eventType: "incident.resolved",
    });
    expect(handle.stored.kind).toBe("waitForEvent");
    expect(handle.stored.eventType).toBe("incident.resolved");
    expect(handle.stored.autoFireOnEnter).toBe(false);
  });

  it("rejects missing eventType", () => {
    expect(() =>
      step.waitForEvent({
        key: "w",
        from: "A",
        to: "B",
        eventType: "",
      }),
    ).toThrow(/eventType/);
  });

  it("preserves predicate, timeout, and onTimeout", () => {
    const handle = step.waitForEvent({
      key: "w",
      from: "A",
      to: "B",
      eventType: "x",
      predicate: { incidentId: "{{subjectId}}" },
      timeout: { offsetFromState: "DETECTED", hours: 72 },
      onTimeout: "draft-with-best-info",
    });
    expect(handle.stored.predicate).toEqual({ incidentId: "{{subjectId}}" });
    expect(handle.stored.onTimeout).toBe("draft-with-best-info");
  });
});

describe("step.decision", () => {
  it("produces kind=decision with branches preserved", () => {
    const handle = step.decision({
      key: "d",
      from: "A",
      to: "B",
      branches: [
        { predicate: { x: { equals: 1 } }, step: "branch-1", to: "C" },
        { predicate: { x: { not: 1 } }, step: "branch-2", to: "D" },
      ],
    });
    expect(handle.stored.kind).toBe("decision");
    expect(handle.stored.branches).toHaveLength(2);
  });

  it("rejects empty branches", () => {
    expect(() =>
      step.decision({
        key: "d",
        from: "A",
        to: "B",
        branches: [],
      }),
    ).toThrow(/branch/);
  });
});

describe("step.qes", () => {
  it("produces kind=qes with documentRefs preserved", () => {
    const handle = step.qes({
      key: "q",
      from: "A",
      to: "B",
      documentRefs: ["doc-1", "doc-2"],
      signingProfile: "dtrust-eIDAS",
    });
    expect(handle.stored.kind).toBe("qes");
    expect(handle.stored.documentRefs).toEqual(["doc-1", "doc-2"]);
    expect(handle.stored.signingProfile).toBe("dtrust-eIDAS");
  });

  it("rejects empty documentRefs", () => {
    expect(() =>
      step.qes({
        key: "q",
        from: "A",
        to: "B",
        documentRefs: [],
      }),
    ).toThrow(/documentRef/);
  });
});
