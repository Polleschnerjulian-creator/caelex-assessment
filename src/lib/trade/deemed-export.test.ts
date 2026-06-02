/**
 * deemed-export.test.ts — Einheitentests für evaluateDeemedExportRisk().
 *
 * Kein jsdom, kein React — reines Node-kompatibles Vitest-Modul.
 * Stabil, kein Timeout-Risiko.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateDeemedExportRisk,
  DEEMED_EXPORT_DISCLAIMER,
  type DeemedExportRisk,
} from "./deemed-export";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Shorthand: uncontrolled item, no org signal */
function uncontrolled(): DeemedExportRisk {
  return evaluateDeemedExportRisk({ isControlled: false });
}

/** Shorthand: controlled item, org signal = true */
function controlledWithForeignNationals(): DeemedExportRisk {
  return evaluateDeemedExportRisk({
    isControlled: true,
    orgHasForeignNationals: true,
  });
}

/** Shorthand: controlled item, org signal = undefined */
function controlledUnknown(): DeemedExportRisk {
  return evaluateDeemedExportRisk({ isControlled: true });
}

/** Shorthand: controlled item, org signal = false */
function controlledNoForeignNationals(): DeemedExportRisk {
  return evaluateDeemedExportRisk({
    isControlled: true,
    orgHasForeignNationals: false,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("evaluateDeemedExportRisk", () => {
  // ── Rule 1: Unkontrolliert → "none" ──────────────────────────────────────

  describe("when isControlled is false", () => {
    it('returns level "none"', () => {
      expect(uncontrolled().level).toBe("none");
    });

    it("returns a non-empty headline", () => {
      expect(uncontrolled().headline.length).toBeGreaterThan(0);
    });

    it('explanation mentions that "nicht eingestuft ≠ keine Pflicht"', () => {
      const { explanation } = uncontrolled();
      // The explanation must honestly note that unclassified ≠ no obligation.
      expect(explanation).toMatch(
        /nicht eingestuft|nicht zwingend|kein.*Kontrollcode/i,
      );
    });

    it("has an empty guidance array — no alarm for uncontrolled items", () => {
      expect(uncontrolled().guidance).toHaveLength(0);
    });

    it("always attaches the canonical disclaimer", () => {
      expect(uncontrolled().disclaimer).toBe(DEEMED_EXPORT_DISCLAIMER);
    });

    it('ignores orgHasForeignNationals when item is uncontrolled — stays "none"', () => {
      const result = evaluateDeemedExportRisk({
        isControlled: false,
        orgHasForeignNationals: true,
      });
      expect(result.level).toBe("none");
    });
  });

  // ── Rule 2: Kontrolliert + Foreign Nationals = true → "action" ───────────

  describe("when isControlled is true and orgHasForeignNationals is true", () => {
    it('returns level "action"', () => {
      expect(controlledWithForeignNationals().level).toBe("action");
    });

    it("has at least 4 concrete guidance items", () => {
      expect(
        controlledWithForeignNationals().guidance.length,
      ).toBeGreaterThanOrEqual(4);
    });

    it("guidance mentions licence / TAA / genehmigung", () => {
      const guidance = controlledWithForeignNationals().guidance.join(" ");
      expect(guidance).toMatch(/Lizenz|TAA|genehmigungs|license/i);
    });

    it("always attaches the canonical disclaimer", () => {
      expect(controlledWithForeignNationals().disclaimer).toBe(
        DEEMED_EXPORT_DISCLAIMER,
      );
    });

    it('explanation mentions "Deemed Export"', () => {
      expect(controlledWithForeignNationals().explanation).toMatch(
        /Deemed.?Export/i,
      );
    });
  });

  // ── Rule 3: Kontrolliert + orgHasForeignNationals undefined → "awareness" ─

  describe("when isControlled is true and orgHasForeignNationals is undefined", () => {
    it('returns level "awareness"', () => {
      expect(controlledUnknown().level).toBe("awareness");
    });

    it("has at least 3 guidance items", () => {
      expect(controlledUnknown().guidance.length).toBeGreaterThanOrEqual(3);
    });

    it("always attaches the canonical disclaimer", () => {
      expect(controlledUnknown().disclaimer).toBe(DEEMED_EXPORT_DISCLAIMER);
    });

    it("explanation mentions deemed export risk", () => {
      expect(controlledUnknown().explanation).toMatch(
        /Deemed.?Export|Ausfuhr/i,
      );
    });
  });

  // ── Rule 4: Kontrolliert + orgHasForeignNationals false → "awareness" ─────

  describe("when isControlled is true and orgHasForeignNationals is false", () => {
    it('returns level "awareness" — never downgrades controlled below awareness', () => {
      expect(controlledNoForeignNationals().level).toBe("awareness");
    });

    it("still has guidance entries", () => {
      expect(controlledNoForeignNationals().guidance.length).toBeGreaterThan(0);
    });

    it("always attaches the canonical disclaimer", () => {
      expect(controlledNoForeignNationals().disclaimer).toBe(
        DEEMED_EXPORT_DISCLAIMER,
      );
    });
  });

  // ── Invariant: Controlled items never below "awareness" ────────────────────

  describe("conservatism invariant", () => {
    it('never returns "none" for a controlled item regardless of other inputs', () => {
      const inputs = [
        { isControlled: true },
        { isControlled: true, orgHasForeignNationals: false },
        { isControlled: true, orgHasForeignNationals: true },
        { isControlled: true, orgHasForeignNationals: undefined },
      ];
      for (const input of inputs) {
        const result = evaluateDeemedExportRisk(input);
        expect(result.level).not.toBe("none");
      }
    });
  });

  // ── Disclaimer constant ────────────────────────────────────────────────────

  describe("DEEMED_EXPORT_DISCLAIMER", () => {
    it("is a non-empty string", () => {
      expect(typeof DEEMED_EXPORT_DISCLAIMER).toBe("string");
      expect(DEEMED_EXPORT_DISCLAIMER.length).toBeGreaterThan(50);
    });

    it('mentions "Risikohinweis" and "keine Rechtsberatung"', () => {
      expect(DEEMED_EXPORT_DISCLAIMER).toMatch(/Risikohinweis/);
      expect(DEEMED_EXPORT_DISCLAIMER).toMatch(/keine Rechtsberatung/);
    });
  });
});
