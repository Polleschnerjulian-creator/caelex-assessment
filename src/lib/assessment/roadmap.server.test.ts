/**
 * Task 3.2 — dated roadmap. Binding assertions:
 *  - DE nexus + not registered → IMMEDIATE BSI item anchored on computedAt
 *    (already-in-force duty, NIS2UmsuCG citation);
 *  - dated items ascending, contested last;
 *  - the contested application-window item carries a FluxFlag built from the
 *    rulebook's CONTESTED_POSITIONS (≥2 positions) — scenario DATA, no date;
 *  - NO fabricated dates: without user dates or an in-force duty, the only
 *    items are contested ones;
 *  - pre-application engagement ships as COPY (Q5.3 cut), not a question.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  computeRoadmap,
  hasGermanNexus,
  PRE_APPLICATION_ENGAGEMENT_NOTE,
} from "./roadmap.server";
import type { AnswerMap } from "./answers";

const answered = (value: string | string[] | boolean | number) => ({
  state: "answered" as const,
  value,
});
const RESULT = { computedAt: "2026-06-10T12:00:00.000Z" };

describe("computeRoadmap", () => {
  it("DE nexus + not registered → immediate BSI item with the NIS2UmsuCG basis", () => {
    const answers: AnswerMap = {
      q6_8_nis2_registration: answered("not_registered"),
      q4_3b_ground_countries: answered(["de", "se"]),
    };
    const items = computeRoadmap(answers, RESULT);
    const bsi = items.find((i) => /BSI/.test(i.action));
    expect(bsi).toBeDefined();
    expect(bsi!.due).toBe("2026-06-10"); // anchored on computedAt, not Date.now
    expect(bsi!.basis[0].citation).toMatch(/NIS2UmsuCG/);
    expect(bsi!.basis[0].verified).toBe(true);
  });

  it("no BSI item without German nexus, even when unregistered", () => {
    const answers: AnswerMap = {
      q6_8_nis2_registration: answered("not_registered"),
      q4_3b_ground_countries: answered(["se"]),
    };
    expect(hasGermanNexus(answers)).toBe(false);
    const items = computeRoadmap(answers, RESULT);
    expect(items.find((i) => /BSI/.test(i.action))).toBeUndefined();
  });

  it("orders dated items ascending and puts contested last", () => {
    const answers: AnswerMap = {
      q5_2_target_launch_date: answered("2027-03-01"),
      q5_2b_target_authorisation_date: answered("2026-11-15"),
      q5_2c_license_expiry_dates: answered("FR license to 2026-09-30"),
    };
    const items = computeRoadmap(answers, RESULT);
    const dues = items.map((i) => i.due);
    expect(dues.slice(0, 3)).toEqual([
      "2026-09-30",
      "2026-11-15",
      "2027-03-01",
    ]);
    expect(dues[dues.length - 1]).toBe("contested");
  });

  it("the contested application-window item carries a ≥2-position flux flag", () => {
    const items = computeRoadmap({}, RESULT);
    const contested = items.filter((i) => i.due === "contested");
    expect(contested).toHaveLength(1);
    expect(contested[0].fluxFlag).toBeDefined();
    expect(contested[0].fluxFlag!.positions.length).toBeGreaterThanOrEqual(2);
    expect(contested[0].fluxFlag!.summary).toMatch(/conservative reading/i);
  });

  it("fabricates NO dates: empty answers yield only contested items", () => {
    const items = computeRoadmap({}, RESULT);
    expect(items.every((i) => i.due === "contested")).toBe(true);
  });

  it("ignores non-ISO garbage in the free-text expiry field", () => {
    const answers: AnswerMap = {
      q5_2c_license_expiry_dates: answered("expires next summer, maybe 2027"),
    };
    const items = computeRoadmap(answers, RESULT);
    expect(items.every((i) => i.due === "contested")).toBe(true);
  });
});

describe("pre-application engagement is roadmap COPY (Q5.3 cut, §7.3)", () => {
  it("the exported note names UK CAA and CNES practice", () => {
    expect(PRE_APPLICATION_ENGAGEMENT_NOTE).toMatch(/UK CAA/);
    expect(PRE_APPLICATION_ENGAGEMENT_NOTE).toMatch(/CNES/);
  });
});
