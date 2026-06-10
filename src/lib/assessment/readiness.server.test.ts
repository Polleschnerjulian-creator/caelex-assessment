/**
 * Task 3.2 — readiness bands. Binding assertions:
 *  - per-cluster N-of-M bands only; the module exports NO overall number
 *    (invariant 6 / founder §11.3);
 *  - an unsure battery item counts as a GAP and is emitted into the unknowns
 *    feed (§5 stage 5);
 *  - not_asked contributes nothing (unasked ≠ gap).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as readinessModule from "./readiness.server";
import {
  computeReadiness,
  parseBatteryEntries,
  readinessUnsureQuestionIds,
} from "./readiness.server";
import type { AnswerMap } from "./answers";

const answered = (value: string | string[] | boolean | number) => ({
  state: "answered" as const,
  value,
});
const unsure = () => ({ state: "unsure" as const });

describe("computeReadiness — battery → resilience_cyber band", () => {
  it("aggregates the 4-state scale + unsure per item", () => {
    const answers: AnswerMap = {
      q6_6_battery: answered([
        "risk_assessment:evidenced",
        "incident_detection_reporting_chain:partial",
        "business_continuity:undocumented",
        "supply_chain:missing",
        "cryptography:unsure",
      ]),
    };
    const bands = computeReadiness(answers, ["resilience_cyber"]);
    expect(bands).toHaveLength(1);
    expect(bands[0]).toEqual({
      clusterId: "resilience_cyber",
      evidenced: 1,
      partial: 1,
      undocumented: 1,
      missing: 1,
      unsure: 1,
      total: 5,
    });
  });

  it("an unsure item is a gap AND feeds the unknowns list", () => {
    const answers: AnswerMap = {
      q6_6_battery: answered(["cryptography:unsure"]),
    };
    const [band] = computeReadiness(answers, ["resilience_cyber"]);
    expect(band.unsure).toBe(1);
    expect(band.evidenced).toBe(0);
    expect(readinessUnsureQuestionIds(answers)).toContain("q6_6_battery");
  });

  it("not_asked / absent questions contribute nothing", () => {
    const answers: AnswerMap = {
      q6_6_battery: { state: "not_asked" },
    };
    expect(computeReadiness(answers, ["resilience_cyber"])).toEqual([]);
    expect(readinessUnsureQuestionIds(answers)).toEqual([]);
  });

  it("malformed battery entries are ignored, never counted as evidence", () => {
    expect(
      parseBatteryEntries(["ok:evidenced", "bad", ":missing", "x:", 42]),
    ).toEqual([{ itemId: "ok", status: "evidenced" }]);
  });
});

describe("computeReadiness — debris/environment mappings", () => {
  it("maps q7_1/q7_2 onto debris_safety and q7_3/q7_4 onto environment", () => {
    const answers: AnswerMap = {
      q7_1_debris_plan: answered("drafted"),
      q7_2_passivation: answered("yes"),
      q7_3_env_data: answered("no"),
      q7_4_aee: unsure(),
    };
    const bands = computeReadiness(answers, ["debris_safety", "environment"]);
    const debris = bands.find((b) => b.clusterId === "debris_safety");
    const env = bands.find((b) => b.clusterId === "environment");
    expect(debris).toMatchObject({ partial: 1, evidenced: 1, total: 2 });
    expect(env).toMatchObject({ missing: 1, unsure: 1, total: 2 });
    expect(readinessUnsureQuestionIds(answers)).toEqual(["q7_4_aee"]);
  });

  it("only requested clusters are returned", () => {
    const answers: AnswerMap = {
      q7_1_debris_plan: answered("approved"),
      q6_6_battery: answered(["risk_assessment:evidenced"]),
    };
    const bands = computeReadiness(answers, ["debris_safety"]);
    expect(bands.map((b) => b.clusterId)).toEqual(["debris_safety"]);
  });
});

describe("invariant 6 — no overall number", () => {
  it("the module exports no overall/score aggregate", () => {
    const exportNames = Object.keys(readinessModule);
    for (const name of exportNames) {
      expect(name).not.toMatch(/overall|score|total(Readiness)?Percent/i);
    }
  });
});
