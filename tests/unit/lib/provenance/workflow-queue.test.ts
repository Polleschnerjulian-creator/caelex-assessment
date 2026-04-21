/**
 * buildWorkflowQueue tests — deterministic ranking + counts.
 */

import { describe, it, expect } from "vitest";
import {
  buildWorkflowQueue,
  describeQueueState,
} from "@/lib/provenance/workflow-queue";
import type {
  CybersecurityRequirement,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";

function makeReq(
  id: string,
  severity: "critical" | "major" | "minor" = "major",
  overrides: Partial<CybersecurityRequirement> = {},
): CybersecurityRequirement {
  return {
    id,
    articleRef: `Art. ${id}`,
    category: "governance",
    title: `Control ${id}`,
    description: "",
    complianceQuestion: "?",
    applicableTo: {},
    tips: [],
    evidenceRequired: [],
    severity,
    status: "not_assessed",
    ...overrides,
  } as CybersecurityRequirement;
}

function makeStatuses(
  entries: Array<[string, RequirementStatus]>,
): Record<string, RequirementStatus> {
  return Object.fromEntries(entries);
}

describe("buildWorkflowQueue — ordering", () => {
  it("puts not-assessed critical before not-assessed major", () => {
    const reqs = [makeReq("a", "major"), makeReq("b", "critical")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
    });
    expect(queue.all[0].req.id).toBe("b");
    expect(queue.all[1].req.id).toBe("a");
  });

  it("sinks compliant items to the bottom regardless of severity", () => {
    const reqs = [
      makeReq("a", "critical"),
      makeReq("b", "minor"),
      makeReq("c", "critical"),
    ];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([["a", "compliant"]]),
    });
    expect(queue.all[queue.all.length - 1].req.id).toBe("a");
  });

  it("non-compliant ranks higher than partial at same severity", () => {
    const reqs = [makeReq("a", "major"), makeReq("b", "major")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([
        ["a", "partial"],
        ["b", "non_compliant"],
      ]),
    });
    expect(queue.all[0].req.id).toBe("b");
    expect(queue.all[1].req.id).toBe("a");
  });

  it("stable tiebreaker: same score sorts by req id ascending", () => {
    const reqs = [makeReq("zebra"), makeReq("alpha"), makeReq("mango")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
    });
    expect(queue.all.map((i) => i.req.id)).toEqual(["alpha", "mango", "zebra"]);
  });
});

describe("buildWorkflowQueue — focus slice", () => {
  it("focus contains only not-assessed + non-compliant items", () => {
    const reqs = [
      makeReq("a", "critical"),
      makeReq("b", "major"),
      makeReq("c", "major"),
    ];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([
        ["a", "compliant"],
        ["b", "partial"],
        ["c", "not_assessed"],
      ]),
    });
    expect(queue.focus.map((i) => i.req.id)).toEqual(["c"]);
  });

  it("focus respects focusSize", () => {
    const reqs = Array.from({ length: 6 }, (_, i) => makeReq(`r${i}`, "major"));
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
      focusSize: 2,
    });
    expect(queue.focus.length).toBe(2);
  });

  it("focus default size is 3", () => {
    const reqs = Array.from({ length: 6 }, (_, i) => makeReq(`r${i}`, "major"));
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
    });
    expect(queue.focus.length).toBe(3);
  });
});

describe("buildWorkflowQueue — blocked slice", () => {
  it("blocked contains only partial items", () => {
    const reqs = [makeReq("a"), makeReq("b"), makeReq("c")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([
        ["a", "partial"],
        ["b", "compliant"],
        ["c", "partial"],
      ]),
    });
    expect(queue.blocked.map((i) => i.req.id).sort()).toEqual(["a", "c"]);
  });
});

describe("buildWorkflowQueue — counts", () => {
  it("counts every status bucket", () => {
    const reqs = [makeReq("a"), makeReq("b"), makeReq("c"), makeReq("d")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([
        ["a", "compliant"],
        ["b", "partial"],
        ["c", "non_compliant"],
      ]),
    });
    expect(queue.counts).toEqual({
      total: 4,
      compliant: 1,
      partial: 1,
      nonCompliant: 1,
      notAssessed: 1,
      criticalOpen: 0,
    });
  });

  it("criticalOpen excludes compliant criticals", () => {
    const reqs = [
      makeReq("a", "critical"),
      makeReq("b", "critical"),
      makeReq("c", "critical"),
    ];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: makeStatuses([["a", "compliant"]]),
    });
    expect(queue.counts.criticalOpen).toBe(2);
  });
});

describe("buildWorkflowQueue — estimates", () => {
  it("estimates 2h for a critical in focus", () => {
    const reqs = [makeReq("a", "critical")];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
    });
    expect(queue.estimatedHoursToday).toBe(2);
  });

  it("estimates 3.5h for critical + major + minor", () => {
    const reqs = [
      makeReq("a", "critical"),
      makeReq("b", "major"),
      makeReq("c", "minor"),
    ];
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
    });
    expect(queue.estimatedHoursToday).toBeCloseTo(3.5);
  });

  it("only counts hours for items IN the focus slice", () => {
    const reqs = Array.from({ length: 10 }, (_, i) =>
      makeReq(`r${i}`, "critical"),
    );
    const queue = buildWorkflowQueue({
      requirements: reqs,
      statusLookup: {},
      focusSize: 2,
    });
    expect(queue.estimatedHoursToday).toBe(4); // 2 criticals × 2h
  });
});

describe("describeQueueState", () => {
  it("returns a positive line when all compliant", () => {
    const queue = buildWorkflowQueue({
      requirements: [makeReq("a"), makeReq("b")],
      statusLookup: makeStatuses([
        ["a", "compliant"],
        ["b", "compliant"],
      ]),
    });
    expect(describeQueueState(queue)).toMatch(/All 2.*compliant/);
  });

  it("returns fresh-start line when nothing assessed", () => {
    const queue = buildWorkflowQueue({
      requirements: [makeReq("a", "critical")],
      statusLookup: {},
    });
    expect(describeQueueState(queue)).toMatch(/Nothing started yet/);
    expect(describeQueueState(queue)).toContain("1 critical");
  });

  it("returns progress line mid-way", () => {
    const queue = buildWorkflowQueue({
      requirements: [makeReq("a"), makeReq("b"), makeReq("c")],
      statusLookup: makeStatuses([
        ["a", "compliant"],
        ["b", "partial"],
      ]),
    });
    expect(describeQueueState(queue)).toContain("2 of 3");
  });
});
