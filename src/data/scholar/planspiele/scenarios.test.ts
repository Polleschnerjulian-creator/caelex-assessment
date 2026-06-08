import { describe, it, expect } from "vitest";
import { listScenarios, getScenarioById } from "./index";
import { getLegalSourceById } from "@/data/legal-sources";
import { getCaseById } from "@/data/legal-cases";

describe("planspiele scenarios", () => {
  it("registry round-trips by id", () => {
    for (const s of listScenarios()) {
      expect(getScenarioById(s.id)?.id).toBe(s.id);
    }
    expect(getScenarioById("does-not-exist")).toBeNull();
  });

  it("every phase rubric sums to 100", () => {
    for (const s of listScenarios()) {
      for (const p of s.phases) {
        const sum = p.rubric.reduce((a, c) => a + c.weight, 0);
        expect(sum, `${s.id}/${p.phaseKey}`).toBe(100);
      }
    }
  });

  it("phases are contiguous and strictly ordered", () => {
    for (const s of listScenarios()) {
      const orders = s.phases.map((p) => p.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("studentRole + aiRoles are all declared in roles[]", () => {
    for (const s of listScenarios()) {
      const keys = new Set(s.roles.map((r) => r.roleKey));
      expect(keys.has(s.studentRole)).toBe(true);
      for (const r of s.aiRoles) expect(keys.has(r)).toBe(true);
    }
  });

  it("every cited corpus id resolves in the frozen corpus", () => {
    for (const s of listScenarios()) {
      for (const p of s.phases) {
        for (const id of p.citedSourceIds) {
          expect(
            getLegalSourceById(id),
            `source ${id} in ${s.id}/${p.phaseKey}`,
          ).toBeTruthy();
        }
        for (const id of p.citedCaseIds) {
          expect(
            getCaseById(id),
            `case ${id} in ${s.id}/${p.phaseKey}`,
          ).toBeTruthy();
        }
      }
    }
  });
});
