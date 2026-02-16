import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthorizationDocumentTemplate } from "@/data/authorization-documents";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock authorization-documents
vi.mock("@/data/authorization-documents", () => ({
  getDocumentsForOperatorType: vi.fn(),
  getRequiredDocuments: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  getDocumentsForOperatorType,
  getRequiredDocuments,
} from "@/data/authorization-documents";
import {
  calculateCompletenessReport,
  isWorkflowReadyForSubmission,
  getPrioritizedActions,
  getMissingDocumentTypes,
  estimateCompletionTime,
  type CompletenessReport,
  type DocumentGap,
  type CompletedDocument,
  type SubmissionBlocker,
  type GapCriticality,
  type CompletionEstimate,
} from "@/lib/services/document-completeness-service";

// ---------- Helpers & Fixtures ----------

const findUniqueMock = prisma.authorizationWorkflow.findUnique as ReturnType<
  typeof vi.fn
>;
const getDocsMock = getDocumentsForOperatorType as ReturnType<typeof vi.fn>;
const getRequiredMock = getRequiredDocuments as ReturnType<typeof vi.fn>;

function makeTemplate(
  overrides: Partial<AuthorizationDocumentTemplate> = {},
): AuthorizationDocumentTemplate {
  return {
    id: overrides.id ?? "tpl_default",
    type: overrides.type ?? "default_doc",
    name: overrides.name ?? "Default Document",
    description: overrides.description ?? "A document",
    articleRef: overrides.articleRef ?? "Art. 7(2)(a)",
    required: overrides.required ?? true,
    applicableTo: overrides.applicableTo ?? ["SCO", "ALL"],
    category: overrides.category ?? "technical",
    estimatedEffort: overrides.estimatedEffort ?? "medium",
    tips: overrides.tips,
  };
}

interface MockDocument {
  documentType: string;
  name: string;
  status: string;
  completedAt: Date | null;
  articleRef: string | null;
  required: boolean;
}

function makeDocument(overrides: Partial<MockDocument> = {}): MockDocument {
  return {
    documentType: overrides.documentType ?? "default_doc",
    name: overrides.name ?? "Default Document",
    status: overrides.status ?? "ready",
    completedAt:
      "completedAt" in overrides
        ? overrides.completedAt!
        : new Date("2025-06-01"),
    articleRef:
      "articleRef" in overrides ? overrides.articleRef! : "Art. 7(2)(a)",
    required: overrides.required ?? true,
  };
}

function setupMocks(params: {
  workflow?: {
    id?: string;
    operatorType?: string | null;
    documents?: MockDocument[];
  } | null;
  requiredTemplates?: AuthorizationDocumentTemplate[];
  allTemplates?: AuthorizationDocumentTemplate[];
}) {
  if (params.workflow === null) {
    findUniqueMock.mockResolvedValue(null);
  } else {
    findUniqueMock.mockResolvedValue({
      id: params.workflow?.id ?? "wf-1",
      operatorType: params.workflow?.operatorType ?? "SCO",
      documents: params.workflow?.documents ?? [],
    });
  }

  const required = params.requiredTemplates ?? [];
  const all = params.allTemplates ?? [
    ...required,
    ...(params.allTemplates?.filter((t) => !t.required) ?? []),
  ];

  getRequiredMock.mockReturnValue(required);
  getDocsMock.mockReturnValue(all);
}

// ---------- Tests ----------

describe("Document Completeness Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // calculateCompletenessReport
  // =============================================
  describe("calculateCompletenessReport", () => {
    it("returns null when workflow is not found", async () => {
      setupMocks({ workflow: null });

      const report = await calculateCompletenessReport("nonexistent");

      expect(report).toBeNull();
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: "nonexistent" },
        include: { documents: true },
      });
    });

    it("defaults operatorType to SCO when workflow.operatorType is null", async () => {
      const tpl = makeTemplate({ type: "mission_desc", required: true });
      setupMocks({
        workflow: { operatorType: null, documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report).not.toBeNull();
      expect(report!.operatorType).toBe("SCO");
      expect(getRequiredMock).toHaveBeenCalledWith("SCO");
      expect(getDocsMock).toHaveBeenCalledWith("SCO");
    });

    // ---------- All documents complete ----------
    it("reports 100% when all mandatory and optional documents are complete", async () => {
      const mandatoryTpl = makeTemplate({
        type: "mission_desc",
        name: "Mission Description",
        required: true,
        category: "technical",
      });
      const optionalTpl = makeTemplate({
        type: "optional_doc",
        name: "Optional Doc",
        required: false,
        category: "legal",
      });

      const mandatoryDoc = makeDocument({
        documentType: "mission_desc",
        name: "Mission Description",
        status: "approved",
        required: true,
      });
      const optionalDoc = makeDocument({
        documentType: "optional_doc",
        name: "Optional Doc",
        status: "submitted",
        required: false,
      });

      setupMocks({
        workflow: { documents: [mandatoryDoc, optionalDoc] },
        requiredTemplates: [mandatoryTpl],
        allTemplates: [mandatoryTpl, optionalTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report).not.toBeNull();
      expect(report!.overallPercentage).toBe(100);
      expect(report!.mandatoryPercentage).toBe(100);
      expect(report!.optionalPercentage).toBe(100);
      expect(report!.mandatoryComplete).toBe(true);
      expect(report!.readyForSubmission).toBe(true);
      expect(report!.completedDocuments).toBe(2);
      expect(report!.completedMandatory).toBe(1);
      expect(report!.completedOptional).toBe(1);
      expect(report!.gaps).toHaveLength(0);
      expect(report!.blockers).toHaveLength(0);
      expect(report!.completedList).toHaveLength(2);
    });

    // ---------- All documents missing ----------
    it("reports 0% when all documents are missing", async () => {
      const tpl1 = makeTemplate({
        type: "doc_a",
        name: "Doc A",
        required: true,
        category: "technical",
      });
      const tpl2 = makeTemplate({
        type: "doc_b",
        name: "Doc B",
        required: true,
        category: "legal",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl1, tpl2],
        allTemplates: [tpl1, tpl2],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report).not.toBeNull();
      expect(report!.overallPercentage).toBe(0);
      expect(report!.mandatoryPercentage).toBe(0);
      expect(report!.mandatoryComplete).toBe(false);
      expect(report!.readyForSubmission).toBe(false);
      expect(report!.completedDocuments).toBe(0);
      expect(report!.gaps).toHaveLength(2);
      expect(report!.blockers).toHaveLength(2);

      // Every gap should be "missing" and "mandatory"
      for (const gap of report!.gaps) {
        expect(gap.reason).toBe("missing");
        expect(gap.criticality).toBe("mandatory");
      }

      // Every blocker should be "missing_mandatory"
      for (const blocker of report!.blockers) {
        expect(blocker.type).toBe("missing_mandatory");
        expect(blocker.severity).toBe("error");
      }
    });

    // ---------- No templates at all ----------
    it("returns 100% when there are zero required and zero optional templates", async () => {
      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [],
        allTemplates: [],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report).not.toBeNull();
      expect(report!.overallPercentage).toBe(100);
      expect(report!.mandatoryPercentage).toBe(100);
      expect(report!.optionalPercentage).toBe(100);
      expect(report!.totalDocuments).toBe(0);
      expect(report!.mandatoryComplete).toBe(true);
      expect(report!.readyForSubmission).toBe(true);
    });

    // ---------- Mixed statuses ----------
    it("handles mixed document statuses correctly", async () => {
      const readyTpl = makeTemplate({
        type: "ready_doc",
        name: "Ready Doc",
        required: true,
        category: "technical",
      });
      const rejectedTpl = makeTemplate({
        type: "rejected_doc",
        name: "Rejected Doc",
        required: true,
        category: "technical",
      });
      const inProgressTpl = makeTemplate({
        type: "in_progress_doc",
        name: "In Progress Doc",
        required: true,
        category: "legal",
      });
      const underReviewTpl = makeTemplate({
        type: "under_review_doc",
        name: "Under Review Doc",
        required: true,
        category: "legal",
      });
      const draftTpl = makeTemplate({
        type: "draft_doc",
        name: "Draft Doc",
        required: true,
        category: "safety",
      });
      const missingTpl = makeTemplate({
        type: "missing_doc",
        name: "Missing Doc",
        required: true,
        category: "safety",
        estimatedEffort: "high",
      });

      const documents = [
        makeDocument({ documentType: "ready_doc", status: "ready" }),
        makeDocument({ documentType: "rejected_doc", status: "rejected" }),
        makeDocument({
          documentType: "in_progress_doc",
          status: "in_progress",
        }),
        makeDocument({
          documentType: "under_review_doc",
          status: "under_review",
        }),
        makeDocument({ documentType: "draft_doc", status: "draft" }),
        // missing_doc has no document at all
      ];

      const allTemplates = [
        readyTpl,
        rejectedTpl,
        inProgressTpl,
        underReviewTpl,
        draftTpl,
        missingTpl,
      ];

      setupMocks({
        workflow: { documents },
        requiredTemplates: allTemplates,
        allTemplates,
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report).not.toBeNull();

      // Only "ready" doc is complete
      expect(report!.completedMandatory).toBe(1);
      expect(report!.mandatoryPercentage).toBe(Math.round((1 / 6) * 100)); // 17

      // In progress: "in_progress" + "under_review"
      expect(report!.inProgressDocuments).toBe(2);

      // Gaps: rejected(1) + in_progress(1) + under_review(1) + draft(1) + missing(1) = 5
      expect(report!.gaps).toHaveLength(5);

      // Blockers: rejected(1) + draft/not-started(1) + missing(1) = 3
      // Note: in_progress and under_review don't produce blockers, just gaps
      expect(report!.blockers).toHaveLength(3);

      // Verify gap reasons
      const gapByType = (type: string) =>
        report!.gaps.find((g) => g.documentType === type);
      expect(gapByType("rejected_doc")!.reason).toBe("rejected");
      expect(gapByType("in_progress_doc")!.reason).toBe("incomplete");
      expect(gapByType("under_review_doc")!.reason).toBe("incomplete");
      expect(gapByType("draft_doc")!.reason).toBe("incomplete");
      expect(gapByType("missing_doc")!.reason).toBe("missing");

      // readyForSubmission should be false (blockers exist)
      expect(report!.readyForSubmission).toBe(false);
    });

    // ---------- "ready", "approved", "submitted" all count as complete ----------
    it("treats ready, approved, and submitted as complete statuses", async () => {
      const tpl1 = makeTemplate({
        type: "doc_ready",
        required: true,
        category: "technical",
      });
      const tpl2 = makeTemplate({
        type: "doc_approved",
        required: true,
        category: "technical",
      });
      const tpl3 = makeTemplate({
        type: "doc_submitted",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_ready", status: "ready" }),
            makeDocument({ documentType: "doc_approved", status: "approved" }),
            makeDocument({
              documentType: "doc_submitted",
              status: "submitted",
            }),
          ],
        },
        requiredTemplates: [tpl1, tpl2, tpl3],
        allTemplates: [tpl1, tpl2, tpl3],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.completedMandatory).toBe(3);
      expect(report!.mandatoryPercentage).toBe(100);
      expect(report!.mandatoryComplete).toBe(true);
    });

    // ---------- Rejected documents create specific blocker ----------
    it("creates rejected_document blocker for rejected mandatory documents", async () => {
      const tpl = makeTemplate({
        type: "rej_doc",
        name: "Rejected Doc",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "rej_doc", status: "rejected" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.blockers).toHaveLength(1);
      expect(report!.blockers[0].type).toBe("rejected_document");
      expect(report!.blockers[0].documentType).toBe("rej_doc");
      expect(report!.blockers[0].severity).toBe("error");
      expect(report!.blockers[0].message).toContain("rejected");
    });

    // ---------- Not-started documents create blocker ----------
    it("creates missing_mandatory blocker for documents with unknown/not-started status", async () => {
      const tpl = makeTemplate({
        type: "draft_doc",
        name: "Draft Doc",
        required: true,
        category: "legal",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "draft_doc", status: "draft" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.blockers).toHaveLength(1);
      expect(report!.blockers[0].type).toBe("missing_mandatory");
      expect(report!.blockers[0].message).toContain("not started");
    });

    // ---------- Optional documents ----------
    it("tracks optional documents separately from mandatory", async () => {
      const mandatoryTpl = makeTemplate({
        type: "mandatory_doc",
        required: true,
        category: "technical",
      });
      const optionalTpl = makeTemplate({
        type: "optional_doc",
        name: "Optional Doc",
        required: false,
        category: "legal",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "mandatory_doc", status: "ready" }),
            // optional_doc is missing
          ],
        },
        requiredTemplates: [mandatoryTpl],
        allTemplates: [mandatoryTpl, optionalTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.totalRequired).toBe(1);
      expect(report!.totalOptional).toBe(1);
      expect(report!.completedMandatory).toBe(1);
      expect(report!.completedOptional).toBe(0);
      expect(report!.mandatoryPercentage).toBe(100);
      expect(report!.optionalPercentage).toBe(0);
      // overall: 1 complete / 2 total = 50%
      expect(report!.overallPercentage).toBe(50);
      // mandatory complete, no blockers => ready for submission
      expect(report!.readyForSubmission).toBe(true);
    });

    it("creates recommended gaps for missing optional documents", async () => {
      const optionalTpl = makeTemplate({
        type: "opt_doc",
        name: "Optional Doc",
        required: false,
        category: "financial",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [],
        allTemplates: [optionalTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.gaps).toHaveLength(1);
      expect(report!.gaps[0].criticality).toBe("recommended");
      expect(report!.gaps[0].reason).toBe("missing");
      expect(report!.gaps[0].suggestedAction).toContain(
        "strengthen your application",
      );
    });

    it("creates recommended gap for in-progress optional documents", async () => {
      const optionalTpl = makeTemplate({
        type: "opt_doc",
        name: "Optional Doc",
        required: false,
        category: "financial",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({
              documentType: "opt_doc",
              status: "in_progress",
              required: false,
            }),
          ],
        },
        requiredTemplates: [],
        allTemplates: [optionalTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.inProgressDocuments).toBe(1);
      expect(report!.gaps).toHaveLength(1);
      expect(report!.gaps[0].criticality).toBe("recommended");
      expect(report!.gaps[0].reason).toBe("incomplete");
      expect(report!.gaps[0].suggestedAction).toContain("stronger application");
    });

    // ---------- completedAt and articleRef mapping ----------
    it("maps completedAt and articleRef from document to completed list entries", async () => {
      const date = new Date("2025-12-15T10:00:00Z");
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({
              documentType: "doc_a",
              status: "approved",
              completedAt: date,
              articleRef: "Art. 7(2)(c)",
            }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.completedList).toHaveLength(1);
      expect(report!.completedList[0].completedAt).toEqual(date);
      expect(report!.completedList[0].articleRef).toBe("Art. 7(2)(c)");
    });

    it("omits completedAt and articleRef when they are null", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({
              documentType: "doc_a",
              status: "ready",
              completedAt: null,
              articleRef: null,
            }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.completedList[0].completedAt).toBeUndefined();
      expect(report!.completedList[0].articleRef).toBeUndefined();
    });

    // ---------- Category breakdown ----------
    it("computes byCategory breakdown correctly", async () => {
      const tech1 = makeTemplate({
        type: "tech1",
        required: true,
        category: "technical",
      });
      const tech2 = makeTemplate({
        type: "tech2",
        required: true,
        category: "technical",
      });
      const legal1 = makeTemplate({
        type: "legal1",
        name: "Legal Doc 1",
        required: false,
        category: "legal",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "tech1", status: "approved" }),
            // tech2 is missing, legal1 is missing
          ],
        },
        requiredTemplates: [tech1, tech2],
        allTemplates: [tech1, tech2, legal1],
      });

      const report = await calculateCompletenessReport("wf-1");

      const techCategory = report!.byCategory.find(
        (c) => c.category === "technical",
      );
      const legalCategory = report!.byCategory.find(
        (c) => c.category === "legal",
      );

      expect(techCategory).toEqual({
        category: "technical",
        total: 2,
        complete: 1,
        percentage: 50,
      });
      expect(legalCategory).toEqual({
        category: "legal",
        total: 1,
        complete: 0,
        percentage: 0,
      });
    });

    // ---------- Recommendations ----------
    it("recommends proceeding when no blockers exist", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("proceed with submission"),
        ),
      ).toBe(true);
    });

    it("mentions blocker count when there are 1-3 blockers", async () => {
      const tpl1 = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });
      const tpl2 = makeTemplate({
        type: "doc_b",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl1, tpl2],
        allTemplates: [tpl1, tpl2],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("2 mandatory document(s) remaining"),
        ),
      ).toBe(true);
    });

    it("recommends focusing on mandatory when more than 3 blockers", async () => {
      const templates = Array.from({ length: 5 }, (_, i) =>
        makeTemplate({
          type: `doc_${i}`,
          name: `Doc ${i}`,
          required: true,
          category: "technical",
        }),
      );

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("Focus on completing mandatory documents"),
        ),
      ).toBe(true);
    });

    it("adds category-specific recommendation when no docs completed in a category", async () => {
      const tpl = makeTemplate({
        type: "fin_doc",
        name: "Financial Doc",
        required: true,
        category: "financial",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some(
          (r) =>
            r.includes("No financial documents completed") &&
            r.includes("starting with these"),
        ),
      ).toBe(true);
    });

    it("adds category remaining count when partially complete", async () => {
      const tpl1 = makeTemplate({
        type: "tech1",
        required: true,
        category: "technical",
      });
      const tpl2 = makeTemplate({
        type: "tech2",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "tech1", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl1, tpl2],
        allTemplates: [tpl1, tpl2],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("1 technical document(s) remaining"),
        ),
      ).toBe(true);
    });

    it("adds high-effort warning for mandatory high-effort gaps", async () => {
      const tpl = makeTemplate({
        type: "hard_doc",
        required: true,
        category: "technical",
        estimatedEffort: "high",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("require significant effort"),
        ),
      ).toBe(true);
    });

    it("does not add high-effort warning for optional high-effort gaps only", async () => {
      const optTpl = makeTemplate({
        type: "hard_opt",
        required: false,
        category: "technical",
        estimatedEffort: "high",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [],
        allTemplates: [optTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(
        report!.recommendations.some((r) =>
          r.includes("require significant effort"),
        ),
      ).toBe(false);
    });

    // ---------- Suggested actions ----------
    it("generates correct suggested actions per gap reason", async () => {
      const missingTpl = makeTemplate({
        type: "missing_doc",
        name: "Missing Doc",
        required: true,
        category: "technical",
        articleRef: "Art. 7",
      });
      const rejectedTpl = makeTemplate({
        type: "rejected_doc",
        name: "Rejected Doc",
        required: true,
        category: "technical",
      });
      const inProgressTpl = makeTemplate({
        type: "ip_doc",
        name: "IP Doc",
        required: true,
        category: "technical",
      });
      const notStartedTpl = makeTemplate({
        type: "ns_doc",
        name: "NS Doc",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "rejected_doc", status: "rejected" }),
            makeDocument({ documentType: "ip_doc", status: "in_progress" }),
            makeDocument({ documentType: "ns_doc", status: "draft" }),
          ],
        },
        requiredTemplates: [
          missingTpl,
          rejectedTpl,
          inProgressTpl,
          notStartedTpl,
        ],
        allTemplates: [missingTpl, rejectedTpl, inProgressTpl, notStartedTpl],
      });

      const report = await calculateCompletenessReport("wf-1");
      const gapByType = (type: string) =>
        report!.gaps.find((g) => g.documentType === type);

      expect(gapByType("missing_doc")!.suggestedAction).toContain(
        'Create and complete "Missing Doc"',
      );
      expect(gapByType("missing_doc")!.suggestedAction).toContain("Art. 7");
      expect(gapByType("rejected_doc")!.suggestedAction).toContain(
        "Revise and resubmit",
      );
      expect(gapByType("ip_doc")!.suggestedAction).toContain(
        'Complete "IP Doc"',
      );
      expect(gapByType("ns_doc")!.suggestedAction).toContain(
        'Start working on "NS Doc"',
      );
    });

    // ---------- Tips propagation ----------
    it("propagates tips from template to gap", async () => {
      const tips = ["Tip 1", "Tip 2"];
      const tpl = makeTemplate({
        type: "doc_with_tips",
        required: true,
        category: "technical",
        tips,
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.gaps[0].tips).toEqual(tips);
    });

    // ---------- Report metadata ----------
    it("includes workflowId, operatorType, and evaluatedAt in report", async () => {
      setupMocks({
        workflow: { id: "wf-abc", operatorType: "LO", documents: [] },
        requiredTemplates: [],
        allTemplates: [],
      });

      const before = new Date();
      const report = await calculateCompletenessReport("wf-abc");
      const after = new Date();

      expect(report!.workflowId).toBe("wf-abc");
      expect(report!.operatorType).toBe("LO");
      expect(report!.evaluatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(report!.evaluatedAt.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    // ---------- Percentage rounding ----------
    it("rounds percentages to nearest integer", async () => {
      // 1 out of 3 = 33.33% => 33
      const templates = [
        makeTemplate({ type: "a", required: true, category: "technical" }),
        makeTemplate({ type: "b", required: true, category: "technical" }),
        makeTemplate({ type: "c", required: true, category: "technical" }),
      ];

      setupMocks({
        workflow: {
          documents: [makeDocument({ documentType: "a", status: "ready" })],
        },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.mandatoryPercentage).toBe(33);
      expect(report!.overallPercentage).toBe(33);
    });
  });

  // =============================================
  // isWorkflowReadyForSubmission
  // =============================================
  describe("isWorkflowReadyForSubmission", () => {
    it("returns not ready with validation_error blocker when workflow not found", async () => {
      setupMocks({ workflow: null });

      const result = await isWorkflowReadyForSubmission("nonexistent");

      expect(result.ready).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].type).toBe("validation_error");
      expect(result.blockers[0].message).toBe("Workflow not found");
      expect(result.blockers[0].severity).toBe("error");
    });

    it("returns ready=true when all mandatory documents are complete", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const result = await isWorkflowReadyForSubmission("wf-1");

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it("returns ready=false with blockers when mandatory documents are missing", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        name: "Mission Desc",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const result = await isWorkflowReadyForSubmission("wf-1");

      expect(result.ready).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });

  // =============================================
  // getPrioritizedActions
  // =============================================
  describe("getPrioritizedActions", () => {
    it("returns empty array when workflow not found", async () => {
      setupMocks({ workflow: null });

      const actions = await getPrioritizedActions("nonexistent");

      expect(actions).toEqual([]);
    });

    it("returns empty array when there are no gaps", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const actions = await getPrioritizedActions("wf-1");

      expect(actions).toEqual([]);
    });

    it("prioritizes mandatory over recommended gaps", async () => {
      const mandatoryTpl = makeTemplate({
        type: "mandatory_doc",
        name: "Mandatory Doc",
        required: true,
        category: "technical",
        estimatedEffort: "high",
      });
      const optionalTpl = makeTemplate({
        type: "optional_doc",
        name: "Optional Doc",
        required: false,
        category: "legal",
        estimatedEffort: "low",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [mandatoryTpl],
        allTemplates: [mandatoryTpl, optionalTpl],
      });

      const actions = await getPrioritizedActions("wf-1");

      expect(actions[0].criticality).toBe("mandatory");
      expect(actions[1].criticality).toBe("recommended");
    });

    it("sorts by effort within same criticality (low first)", async () => {
      const highEffort = makeTemplate({
        type: "high_doc",
        name: "High Effort",
        required: true,
        category: "technical",
        estimatedEffort: "high",
      });
      const lowEffort = makeTemplate({
        type: "low_doc",
        name: "Low Effort",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });
      const medEffort = makeTemplate({
        type: "med_doc",
        name: "Medium Effort",
        required: true,
        category: "technical",
        estimatedEffort: "medium",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [highEffort, lowEffort, medEffort],
        allTemplates: [highEffort, lowEffort, medEffort],
      });

      const actions = await getPrioritizedActions("wf-1");

      expect(actions[0].estimatedEffort).toBe("low");
      expect(actions[1].estimatedEffort).toBe("medium");
      expect(actions[2].estimatedEffort).toBe("high");
    });

    it("respects limit parameter", async () => {
      const templates = Array.from({ length: 10 }, (_, i) =>
        makeTemplate({
          type: `doc_${i}`,
          name: `Doc ${i}`,
          required: true,
          category: "technical",
        }),
      );

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const limited = await getPrioritizedActions("wf-1", 3);
      expect(limited).toHaveLength(3);

      const defaultLimit = await getPrioritizedActions("wf-1");
      expect(defaultLimit).toHaveLength(5); // default limit is 5
    });
  });

  // =============================================
  // getMissingDocumentTypes
  // =============================================
  describe("getMissingDocumentTypes", () => {
    it("returns empty array when workflow not found", async () => {
      setupMocks({ workflow: null });

      const result = await getMissingDocumentTypes("nonexistent");

      expect(result).toEqual([]);
    });

    it("returns only document types with reason=missing", async () => {
      const missingTpl = makeTemplate({
        type: "missing_doc",
        required: true,
        category: "technical",
      });
      const rejectedTpl = makeTemplate({
        type: "rejected_doc",
        required: true,
        category: "technical",
      });
      const incompleteTpl = makeTemplate({
        type: "incomplete_doc",
        required: true,
        category: "technical",
      });
      const optMissingTpl = makeTemplate({
        type: "opt_missing",
        required: false,
        category: "legal",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({
              documentType: "rejected_doc",
              status: "rejected",
            }),
            makeDocument({
              documentType: "incomplete_doc",
              status: "in_progress",
            }),
          ],
        },
        requiredTemplates: [missingTpl, rejectedTpl, incompleteTpl],
        allTemplates: [missingTpl, rejectedTpl, incompleteTpl, optMissingTpl],
      });

      const result = await getMissingDocumentTypes("wf-1");

      // Only truly missing docs (no uploaded document at all)
      expect(result).toContain("missing_doc");
      expect(result).toContain("opt_missing");
      expect(result).not.toContain("rejected_doc"); // rejected != missing
      expect(result).not.toContain("incomplete_doc"); // incomplete != missing
    });

    it("returns empty array when all documents exist", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const result = await getMissingDocumentTypes("wf-1");

      expect(result).toEqual([]);
    });
  });

  // =============================================
  // estimateCompletionTime
  // =============================================
  describe("estimateCompletionTime", () => {
    it("returns null when workflow not found", async () => {
      setupMocks({ workflow: null });

      const estimate = await estimateCompletionTime("nonexistent");

      expect(estimate).toBeNull();
    });

    it("returns zero days when no mandatory gaps exist", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "approved" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const estimate = await estimateCompletionTime("wf-1");

      expect(estimate).not.toBeNull();
      expect(estimate!.lowEffortDays).toBe(0);
      expect(estimate!.mediumEffortDays).toBe(0);
      expect(estimate!.highEffortDays).toBe(0);
      expect(estimate!.totalEstimatedDays).toBe(0);
      expect(estimate!.confidence).toBe("high");
    });

    it("calculates effort days correctly per effort level", async () => {
      const lowTpl = makeTemplate({
        type: "low_doc",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });
      const medTpl = makeTemplate({
        type: "med_doc",
        required: true,
        category: "technical",
        estimatedEffort: "medium",
      });
      const highTpl = makeTemplate({
        type: "high_doc",
        required: true,
        category: "technical",
        estimatedEffort: "high",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [lowTpl, medTpl, highTpl],
        allTemplates: [lowTpl, medTpl, highTpl],
      });

      const estimate = await estimateCompletionTime("wf-1");

      expect(estimate!.lowEffortDays).toBe(2); // EFFORT_DAYS.low = 2
      expect(estimate!.mediumEffortDays).toBe(5); // EFFORT_DAYS.medium = 5
      expect(estimate!.highEffortDays).toBe(10); // EFFORT_DAYS.high = 10
      // Total: (2+5+10) * 0.7 = 11.9 => ceil = 12
      expect(estimate!.totalEstimatedDays).toBe(12);
    });

    it("accumulates multiple documents of same effort level", async () => {
      const low1 = makeTemplate({
        type: "low1",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });
      const low2 = makeTemplate({
        type: "low2",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [low1, low2],
        allTemplates: [low1, low2],
      });

      const estimate = await estimateCompletionTime("wf-1");

      expect(estimate!.lowEffortDays).toBe(4); // 2 * 2
      // Total: 4 * 0.7 = 2.8 => ceil = 3
      expect(estimate!.totalEstimatedDays).toBe(3);
    });

    it("applies 70% parallelization factor to total", async () => {
      const tpl = makeTemplate({
        type: "doc",
        required: true,
        category: "technical",
        estimatedEffort: "high",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const estimate = await estimateCompletionTime("wf-1");

      // rawTotal = 10, * 0.7 = 7.0, ceil = 7
      expect(estimate!.totalEstimatedDays).toBe(7);
    });

    it("only counts mandatory gaps for estimate, not optional", async () => {
      const mandatoryTpl = makeTemplate({
        type: "mand",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });
      const optionalTpl = makeTemplate({
        type: "opt",
        required: false,
        category: "legal",
        estimatedEffort: "high",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [mandatoryTpl],
        allTemplates: [mandatoryTpl, optionalTpl],
      });

      const estimate = await estimateCompletionTime("wf-1");

      // Only the mandatory low-effort gap counts: 2 days
      expect(estimate!.lowEffortDays).toBe(2);
      expect(estimate!.highEffortDays).toBe(0); // optional high not counted
    });

    // ---------- Confidence levels ----------
    it("returns high confidence with 0-2 mandatory gaps", async () => {
      const tpl = makeTemplate({
        type: "doc",
        required: true,
        category: "technical",
        estimatedEffort: "low",
      });

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const estimate = await estimateCompletionTime("wf-1");
      expect(estimate!.confidence).toBe("high");
    });

    it("returns high confidence with exactly 2 mandatory gaps", async () => {
      const templates = [
        makeTemplate({
          type: "a",
          required: true,
          category: "technical",
          estimatedEffort: "low",
        }),
        makeTemplate({
          type: "b",
          required: true,
          category: "technical",
          estimatedEffort: "low",
        }),
      ];

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const estimate = await estimateCompletionTime("wf-1");
      expect(estimate!.confidence).toBe("high");
    });

    it("returns medium confidence with 3-5 mandatory gaps", async () => {
      const templates = Array.from({ length: 4 }, (_, i) =>
        makeTemplate({
          type: `doc_${i}`,
          required: true,
          category: "technical",
          estimatedEffort: "low",
        }),
      );

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const estimate = await estimateCompletionTime("wf-1");
      expect(estimate!.confidence).toBe("medium");
    });

    it("returns medium confidence with exactly 5 mandatory gaps", async () => {
      const templates = Array.from({ length: 5 }, (_, i) =>
        makeTemplate({
          type: `doc_${i}`,
          required: true,
          category: "technical",
          estimatedEffort: "low",
        }),
      );

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const estimate = await estimateCompletionTime("wf-1");
      expect(estimate!.confidence).toBe("medium");
    });

    it("returns low confidence with 6+ mandatory gaps", async () => {
      const templates = Array.from({ length: 6 }, (_, i) =>
        makeTemplate({
          type: `doc_${i}`,
          required: true,
          category: "technical",
          estimatedEffort: "low",
        }),
      );

      setupMocks({
        workflow: { documents: [] },
        requiredTemplates: templates,
        allTemplates: templates,
      });

      const estimate = await estimateCompletionTime("wf-1");
      expect(estimate!.confidence).toBe("low");
    });
  });

  // =============================================
  // CompletenessReport structure completeness
  // =============================================
  describe("CompletenessReport structure", () => {
    it("contains all expected fields", async () => {
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          id: "wf-struct",
          operatorType: "SCO",
          documents: [makeDocument({ documentType: "doc_a", status: "ready" })],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-struct");

      // Assert every field from the interface is present
      expect(report).toHaveProperty("workflowId");
      expect(report).toHaveProperty("operatorType");
      expect(report).toHaveProperty("evaluatedAt");
      expect(report).toHaveProperty("overallPercentage");
      expect(report).toHaveProperty("mandatoryPercentage");
      expect(report).toHaveProperty("optionalPercentage");
      expect(report).toHaveProperty("totalDocuments");
      expect(report).toHaveProperty("totalRequired");
      expect(report).toHaveProperty("totalOptional");
      expect(report).toHaveProperty("completedDocuments");
      expect(report).toHaveProperty("completedMandatory");
      expect(report).toHaveProperty("completedOptional");
      expect(report).toHaveProperty("inProgressDocuments");
      expect(report).toHaveProperty("mandatoryComplete");
      expect(report).toHaveProperty("readyForSubmission");
      expect(report).toHaveProperty("gaps");
      expect(report).toHaveProperty("blockers");
      expect(report).toHaveProperty("completedList");
      expect(report).toHaveProperty("recommendations");
      expect(report).toHaveProperty("byCategory");

      // Type checks
      expect(typeof report!.overallPercentage).toBe("number");
      expect(typeof report!.mandatoryComplete).toBe("boolean");
      expect(typeof report!.readyForSubmission).toBe("boolean");
      expect(Array.isArray(report!.gaps)).toBe(true);
      expect(Array.isArray(report!.blockers)).toBe(true);
      expect(Array.isArray(report!.completedList)).toBe(true);
      expect(Array.isArray(report!.recommendations)).toBe(true);
      expect(Array.isArray(report!.byCategory)).toBe(true);
      expect(report!.evaluatedAt).toBeInstanceOf(Date);
    });
  });

  // =============================================
  // Edge case: readyForSubmission requires both conditions
  // =============================================
  describe("readyForSubmission edge cases", () => {
    it("is false when mandatory count matches but blockers exist (e.g. rejected mandatory)", async () => {
      // This scenario: mandatory doc exists and is rejected
      // completedMandatory (0) != totalRequired (1), so mandatoryComplete is false
      const tpl = makeTemplate({
        type: "doc_a",
        required: true,
        category: "technical",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "doc_a", status: "rejected" }),
          ],
        },
        requiredTemplates: [tpl],
        allTemplates: [tpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.mandatoryComplete).toBe(false);
      expect(report!.readyForSubmission).toBe(false);
      expect(report!.blockers.length).toBeGreaterThan(0);
    });

    it("is true even when optional documents are incomplete", async () => {
      const mandTpl = makeTemplate({
        type: "mand",
        required: true,
        category: "technical",
      });
      const optTpl = makeTemplate({
        type: "opt",
        required: false,
        category: "legal",
      });

      setupMocks({
        workflow: {
          documents: [
            makeDocument({ documentType: "mand", status: "approved" }),
            // opt is missing
          ],
        },
        requiredTemplates: [mandTpl],
        allTemplates: [mandTpl, optTpl],
      });

      const report = await calculateCompletenessReport("wf-1");

      expect(report!.mandatoryComplete).toBe(true);
      expect(report!.readyForSubmission).toBe(true);
    });
  });
});
