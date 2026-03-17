import { describe, it, expect } from "vitest";
import {
  getAllEnactedRequirements,
  getAvailableJurisdictions,
  getJurisdiction,
  findRequirementById,
} from "./index";
import {
  getAllMappings,
  getActionableMappings,
  getNewObligationMappings,
} from "./regulatory-map";
import { getEUSpaceActArticles } from "./eu-space-act-proposal";

describe("Regulatory Data Consistency", () => {
  describe("Enacted Requirements", () => {
    it("all requirements have unique IDs", () => {
      const reqs = getAllEnactedRequirements();
      const ids = reqs.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all requirements have enacted or published status", () => {
      const reqs = getAllEnactedRequirements();
      for (const req of reqs) {
        expect(["enacted", "published"]).toContain(req.source.status);
      }
    });

    it("all requirements have non-empty source reference", () => {
      const reqs = getAllEnactedRequirements();
      for (const req of reqs) {
        expect(req.source.reference.length).toBeGreaterThan(0);
        expect(req.source.framework.length).toBeGreaterThan(0);
        expect(req.source.title.length).toBeGreaterThan(0);
      }
    });

    it("EU Space Act proposal references always have disclaimer", () => {
      const reqs = getAllEnactedRequirements();
      for (const req of reqs) {
        if (req.euSpaceActProposal) {
          expect(req.euSpaceActProposal.disclaimer).toContain("COM(2025) 335");
          expect(req.euSpaceActProposal.disclaimer).toContain(
            "legislative proposal",
          );
        }
      }
    });

    it("findRequirementById returns correct requirement", () => {
      const reqs = getAllEnactedRequirements();
      if (reqs.length > 0) {
        const first = reqs[0];
        const found = findRequirementById(first.id);
        expect(found).not.toBeNull();
        expect(found!.id).toBe(first.id);
      }
    });

    it("has requirements across all major categories", () => {
      const reqs = getAllEnactedRequirements();
      const categories = new Set(reqs.map((r) => r.category));
      expect(categories.has("debris")).toBe(true);
      expect(categories.has("cybersecurity")).toBe(true);
      expect(categories.has("spectrum")).toBe(true);
      expect(categories.has("export_control")).toBe(true);
    });

    it("has at least 80 total enacted requirements", () => {
      const reqs = getAllEnactedRequirements();
      expect(reqs.length).toBeGreaterThanOrEqual(80);
    });
  });

  describe("Jurisdictions", () => {
    it("has 10 available jurisdictions", () => {
      const codes = getAvailableJurisdictions();
      expect(codes.length).toBe(10);
      expect(codes).toContain("FR");
      expect(codes).toContain("DE");
      expect(codes).toContain("GB");
    });

    it("all jurisdictions have non-empty NCA data", () => {
      const codes = getAvailableJurisdictions();
      for (const code of codes) {
        const j = getJurisdiction(code);
        expect(j).not.toBeNull();
        expect(j!.nca.name.length).toBeGreaterThan(0);
        expect(j!.nca.language.length).toBeGreaterThan(0);
      }
    });

    it("all jurisdictions have compliance matrix format", () => {
      const codes = getAvailableJurisdictions();
      for (const code of codes) {
        const j = getJurisdiction(code);
        expect(j!.complianceMatrixFormat.statusValues.length).toBeGreaterThan(
          0,
        );
        expect(j!.complianceMatrixFormat.columns.length).toBeGreaterThan(0);
      }
    });

    it("France has deep CNES knowledge base", () => {
      const fr = getJurisdiction("FR");
      expect(fr!.knowledgeBase.length).toBeGreaterThan(1000);
      expect(fr!.knowledgeBase).toContain("STELA");
      expect(fr!.knowledgeBase).toContain("DEBRISK");
      expect(fr!.knowledgeBase).toContain("RT");
    });

    it("Germany has deep BNetzA knowledge base", () => {
      const de = getJurisdiction("DE");
      expect(de!.knowledgeBase.length).toBeGreaterThan(1000);
      expect(de!.knowledgeBase).toContain("BSI");
      expect(de!.knowledgeBase).toContain("NIS2");
      expect(de!.knowledgeBase).toContain("WRG");
    });

    it("Germany spaceLaw is null (no comprehensive space law)", () => {
      const de = getJurisdiction("DE");
      expect(de!.spaceLaw).toBeNull();
    });

    it("France spaceLaw is enacted", () => {
      const fr = getJurisdiction("FR");
      expect(fr!.spaceLaw).not.toBeNull();
      expect(fr!.spaceLaw!.status).toBe("enacted");
      expect(fr!.spaceLaw!.name).toContain("LOS");
    });

    it("all jurisdictions have at least 1 requirement", () => {
      const codes = getAvailableJurisdictions();
      for (const code of codes) {
        const j = getJurisdiction(code);
        expect(j!.requirements.length).toBeGreaterThan(0);
      }
    });
  });

  describe("EU Space Act Proposal", () => {
    it("all articles have LEGISLATIVE_PROPOSAL status", () => {
      const articles = getEUSpaceActArticles();
      for (const art of articles) {
        expect(art.status).toBe("LEGISLATIVE_PROPOSAL");
      }
    });

    it("all articles have COM(2025) 335 reference", () => {
      const articles = getEUSpaceActArticles();
      for (const art of articles) {
        expect(art.proposalRef).toBe("COM(2025) 335");
      }
    });

    it("all articles have disclaimer", () => {
      const articles = getEUSpaceActArticles();
      for (const art of articles) {
        expect(art.disclaimer.length).toBeGreaterThan(0);
        expect(art.disclaimer).toContain("proposal");
      }
    });

    it("articles have enacted equivalents with valid relationships", () => {
      const articles = getEUSpaceActArticles();
      const validRelationships = ["codifies", "extends", "new_obligation"];
      for (const art of articles) {
        for (const eq of art.enactedEquivalents) {
          expect(validRelationships).toContain(eq.relationship);
        }
      }
    });

    it("has at least 40 key articles", () => {
      const articles = getEUSpaceActArticles();
      expect(articles.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe("Cross-Reference Map", () => {
    it("all mappings have unique IDs", () => {
      const mappings = getAllMappings();
      const ids = mappings.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all mappings have at least one reference", () => {
      const mappings = getAllMappings();
      for (const m of mappings) {
        const totalRefs =
          m.references.international.length +
          m.references.national.length +
          (m.references.euSpaceAct ? 1 : 0);
        expect(totalRefs).toBeGreaterThan(0);
      }
    });

    it("actionable mappings have enacted references", () => {
      const actionable = getActionableMappings();
      for (const m of actionable) {
        const enactedRefs =
          m.references.international.length + m.references.national.length;
        expect(enactedRefs).toBeGreaterThan(0);
      }
    });

    it("new obligation mappings have no enacted references", () => {
      const newObs = getNewObligationMappings();
      for (const m of newObs) {
        expect(m.references.international.length).toBe(0);
        expect(m.references.national.length).toBe(0);
      }
    });

    it("EU Space Act references in mappings always have proposal status", () => {
      const mappings = getAllMappings();
      for (const m of mappings) {
        if (m.references.euSpaceAct) {
          expect(m.references.euSpaceAct.status).toBe("proposal");
        }
      }
    });

    it("has at least 15 mappings", () => {
      const mappings = getAllMappings();
      expect(mappings.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe("No article number conflicts", () => {
    it("EU Space Act article numbers are unique", () => {
      const articles = getEUSpaceActArticles();
      const numbers = articles.map((a) => a.articleNumber);
      const unique = new Set(numbers);
      expect(unique.size).toBe(numbers.length);
    });

    it("enacted requirement IDs are globally unique across all standards", () => {
      const all = getAllEnactedRequirements();
      const ids = all.map((r) => r.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });
});
