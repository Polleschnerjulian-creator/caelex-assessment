/**
 * classification-coverage.test.ts — TDD für die Ehrlichkeits-Bewertung.
 *
 * Verifiziert, dass:
 *   - Leere Vorschläge als "no-data" bewertet werden (nicht als Freigabe)
 *   - Nur-LOW-Treffer als "uncertain" bewertet werden
 *   - Mind. ein MEDIUM/HIGH als "matched" bewertet wird
 *   - Artikel mit Codes → null (kein Hinweis)
 *   - CLASSIFIED ohne Codes → "matched" (ruhige Bestätigung)
 *   - DRAFT/REQUIRES_REVIEW ohne Codes → "no-data" (ehrliche Warnung)
 *   - ARCHIVED → null
 *   - Disclaimer ist überall Single-Source
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  assessSuggestionCoverage,
  assessItemClassificationHonesty,
  CLASSIFICATION_HONESTY_DISCLAIMER,
  type CoverageVerdict,
} from "./classification-coverage";

// ─── Helper ───────────────────────────────────────────────────────────────────

function s(confidence: "HIGH" | "MEDIUM" | "LOW") {
  return { confidence };
}

// ─── assessSuggestionCoverage ─────────────────────────────────────────────────

describe("assessSuggestionCoverage", () => {
  describe("empty suggestions → no-data", () => {
    it("returns level no-data when suggestions is empty", () => {
      const v = assessSuggestionCoverage([]);
      expect(v.level).toBe("no-data");
    });

    it("headline mentions absence of classification data", () => {
      const v = assessSuggestionCoverage([]);
      expect(v.headline).toMatch(/[Kk]eine Einstufung/);
    });

    it("message states absence ≠ uncontrolled", () => {
      const v = assessSuggestionCoverage([]);
      expect(v.message).toMatch(/nicht.*unkontrolliert|unkontrolliert.*nicht/i);
    });

    it("message mentions that data is a curated seed focused on space", () => {
      const v = assessSuggestionCoverage([]);
      // Must mention "Seed" or "Schwerpunkt" or "Raumfahrt"
      expect(v.message).toMatch(/Seed|Schwerpunkt|Raumfahrt/i);
    });

    it("message mentions getting it classified by expert before treating as free", () => {
      const v = assessSuggestionCoverage([]);
      expect(v.message).toMatch(
        /Experte|Fachperson|Sachverständige|einstufen/i,
      );
    });

    it("disclaimer is the shared CLASSIFICATION_HONESTY_DISCLAIMER const", () => {
      const v = assessSuggestionCoverage([]);
      expect(v.disclaimer).toBe(CLASSIFICATION_HONESTY_DISCLAIMER);
    });
  });

  describe("only LOW confidence → uncertain", () => {
    it("returns level uncertain when all suggestions are LOW", () => {
      const v = assessSuggestionCoverage([s("LOW"), s("LOW"), s("LOW")]);
      expect(v.level).toBe("uncertain");
    });

    it("single LOW → uncertain", () => {
      expect(assessSuggestionCoverage([s("LOW")]).level).toBe("uncertain");
    });

    it("headline mentions weak match and confirmation", () => {
      const v = assessSuggestionCoverage([s("LOW")]);
      expect(v.headline).toMatch(/schwach|Treffer|bestätigen/i);
    });

    it("disclaimer is the shared const", () => {
      expect(assessSuggestionCoverage([s("LOW")]).disclaimer).toBe(
        CLASSIFICATION_HONESTY_DISCLAIMER,
      );
    });
  });

  describe("at least MEDIUM → matched", () => {
    it("returns matched when there is at least one MEDIUM", () => {
      expect(assessSuggestionCoverage([s("LOW"), s("MEDIUM")]).level).toBe(
        "matched",
      );
    });

    it("returns matched when there is at least one HIGH", () => {
      expect(assessSuggestionCoverage([s("HIGH")]).level).toBe("matched");
    });

    it("returns matched for HIGH + MEDIUM mix", () => {
      expect(
        assessSuggestionCoverage([s("HIGH"), s("MEDIUM"), s("LOW")]).level,
      ).toBe("matched");
    });

    it("matched headline mentions confirmation", () => {
      const v = assessSuggestionCoverage([s("HIGH")]);
      expect(v.headline).toMatch(/bestätigt|Vorschlag/i);
    });

    it("matched message says it is a suggestion, not a final legal classification", () => {
      const v = assessSuggestionCoverage([s("HIGH")]);
      expect(v.message).toMatch(
        /Vorschlag|Hilfsmittel|keine.*endgültige|endgültige.*Einstufung/i,
      );
    });

    it("disclaimer is the shared const", () => {
      expect(assessSuggestionCoverage([s("HIGH")]).disclaimer).toBe(
        CLASSIFICATION_HONESTY_DISCLAIMER,
      );
    });
  });

  describe("CLASSIFICATION_HONESTY_DISCLAIMER", () => {
    it("mentions keine Rechtsberatung", () => {
      expect(CLASSIFICATION_HONESTY_DISCLAIMER).toMatch(/Rechtsberatung/);
    });

    it("states absence is not a clearance", () => {
      expect(CLASSIFICATION_HONESTY_DISCLAIMER).toMatch(
        /fehlende.*Einstufung.*keine.*Freigabe|keine.*Freigabe/i,
      );
    });
  });
});

// ─── assessItemClassificationHonesty ─────────────────────────────────────────

describe("assessItemClassificationHonesty", () => {
  describe("hasCodes === true → null (DeemedExportWarning handles it)", () => {
    it("returns null for DRAFT with codes", () => {
      expect(
        assessItemClassificationHonesty({ status: "DRAFT", hasCodes: true }),
      ).toBeNull();
    });

    it("returns null for CLASSIFIED with codes", () => {
      expect(
        assessItemClassificationHonesty({
          status: "CLASSIFIED",
          hasCodes: true,
        }),
      ).toBeNull();
    });

    it("returns null for REQUIRES_REVIEW with codes", () => {
      expect(
        assessItemClassificationHonesty({
          status: "REQUIRES_REVIEW",
          hasCodes: true,
        }),
      ).toBeNull();
    });

    it("returns null for ARCHIVED with codes", () => {
      expect(
        assessItemClassificationHonesty({
          status: "ARCHIVED",
          hasCodes: true,
        }),
      ).toBeNull();
    });
  });

  describe("ARCHIVED → null (no note)", () => {
    it("returns null for ARCHIVED without codes", () => {
      expect(
        assessItemClassificationHonesty({
          status: "ARCHIVED",
          hasCodes: false,
        }),
      ).toBeNull();
    });
  });

  describe("CLASSIFIED + !hasCodes → matched (calm deliberate determination)", () => {
    let verdict: CoverageVerdict | null;
    beforeAll(() => {
      verdict = assessItemClassificationHonesty({
        status: "CLASSIFIED",
        hasCodes: false,
      });
    });

    it("returns non-null verdict", () => {
      expect(verdict).not.toBeNull();
    });

    it("level is matched", () => {
      expect(verdict!.level).toBe("matched");
    });

    it("headline mentions unlisted / nicht gelistet", () => {
      expect(verdict!.headline).toMatch(/nicht.*gelistet|gelistet|EAR99/i);
    });

    it("message is calm — does NOT contain alarm words like Warnung or Fehler", () => {
      // Should be a calm confirmation, not an alarm
      expect(verdict!.message).not.toMatch(/\bWarnung\b|\bFehler\b|\bAlarm\b/i);
    });

    it("message mentions it is a documented determination", () => {
      expect(verdict!.message).toMatch(
        /dokumentiert|Entscheidung|Einstufung|bewusst/i,
      );
    });

    it("disclaimer is the shared const", () => {
      expect(verdict!.disclaimer).toBe(CLASSIFICATION_HONESTY_DISCLAIMER);
    });
  });

  describe("DRAFT + !hasCodes → no-data (honest warning)", () => {
    let verdict: CoverageVerdict | null;
    beforeAll(() => {
      verdict = assessItemClassificationHonesty({
        status: "DRAFT",
        hasCodes: false,
      });
    });

    it("returns non-null verdict", () => {
      expect(verdict).not.toBeNull();
    });

    it("level is no-data", () => {
      expect(verdict!.level).toBe("no-data");
    });

    it("headline says not yet classified and not to treat as uncontrolled", () => {
      expect(verdict!.headline).toMatch(/eingestuft|unkontrolliert/i);
    });

    it("message states missing classification ≠ free", () => {
      expect(verdict!.message).toMatch(
        /nicht.*unkontrolliert|unkontrolliert.*nicht|fehlende.*Einstufung|nicht.*frei/i,
      );
    });

    it("message mentions curated seed / space focus", () => {
      expect(verdict!.message).toMatch(/Seed|Schwerpunkt|Raumfahrt/i);
    });

    it("message says to get expert classification before treating as free", () => {
      expect(verdict!.message).toMatch(/Experte|Fachperson|einstufen/i);
    });

    it("disclaimer is the shared const", () => {
      expect(verdict!.disclaimer).toBe(CLASSIFICATION_HONESTY_DISCLAIMER);
    });
  });

  describe("REQUIRES_REVIEW + !hasCodes → no-data", () => {
    it("returns no-data for REQUIRES_REVIEW without codes", () => {
      const v = assessItemClassificationHonesty({
        status: "REQUIRES_REVIEW",
        hasCodes: false,
      });
      expect(v).not.toBeNull();
      expect(v!.level).toBe("no-data");
    });

    it("message is conservative (not free)", () => {
      const v = assessItemClassificationHonesty({
        status: "REQUIRES_REVIEW",
        hasCodes: false,
      });
      expect(v!.message).toMatch(/nicht.*frei|unkontrolliert|frei/i);
    });
  });

  describe("never presents unclassified item as free", () => {
    const unclassifiedStatuses: Array<"DRAFT" | "REQUIRES_REVIEW"> = [
      "DRAFT",
      "REQUIRES_REVIEW",
    ];

    for (const status of unclassifiedStatuses) {
      it(`${status} without codes → level is no-data (never matched or null)`, () => {
        const v = assessItemClassificationHonesty({
          status,
          hasCodes: false,
        });
        expect(v).not.toBeNull();
        expect(v!.level).toBe("no-data");
      });
    }
  });
});
