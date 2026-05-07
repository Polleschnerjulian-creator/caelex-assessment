/**
 * Sprint 10J — Tests for the two new V2-Sprint-H/I actions:
 *
 *   - delegateComplianceItem (Sprint H, REQUEST_FROM_TEAM affordance)
 *   - attachDocumentToItem   (Sprint I, UPLOAD_EVIDENCE picker)
 *
 * These were the first defineAction()-backed handlers without test
 * coverage. We mock the framework's surrounding deps (auth, prisma,
 * ratelimit, audit, revalidatePath) to focus assertions on what the
 * handlers actually do — the auth + audit + ratelimit chain itself
 * is exercised by the existing snooze/markAttested tests transitively
 * (when those actions execute, they take the same path).
 *
 * Coverage:
 *   delegate (4):
 *     - happy path → writes Notification + Note + audit verb
 *     - self-delegate throws (assigneeUserId === ctx.userId)
 *     - cross-tenant assignee throws (no shared org)
 *     - notification.actionUrl points to the item-detail route
 *   attachDocument (3):
 *     - happy path with user-owned doc → writes citation note
 *     - same-org doc (different uploader) → still allowed
 *     - foreign-org doc → throws
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuth,
  mockCheckRateLimit,
  mockLogAuditEvent,
  mockRevalidatePath,
  mockOrgMemberFindFirst,
  mockUserFindUnique,
  mockNotificationCreate,
  mockComplianceItemNoteCreate,
  mockDebrisStatusFindUnique,
  mockDocumentFindUnique,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockOrgMemberFindFirst: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockNotificationCreate: vi.fn(),
  mockComplianceItemNoteCreate: vi.fn(),
  mockDebrisStatusFindUnique: vi.fn(),
  mockDocumentFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: mockLogAuditEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: () => false }));
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : String(e),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: mockOrgMemberFindFirst },
    user: { findUnique: mockUserFindUnique },
    notification: { create: mockNotificationCreate },
    complianceItemNote: { create: mockComplianceItemNoteCreate },
    debrisRequirementStatus: { findUnique: mockDebrisStatusFindUnique },
    document: { findUnique: mockDocumentFindUnique },
  },
}));

import {
  delegateComplianceItem,
  attachDocumentToItem,
} from "./compliance-item-actions";

const REQUESTER_ID = "user_alice";
const ASSIGNEE_ID = "user_bob";
const SHARED_ORG_ID = "org_acme";
const ROW_ID = "row_xyz";
const ITEM_ID = `DEBRIS:${ROW_ID}`;

beforeEach(() => {
  vi.clearAllMocks();
  // Default authenticated session as the requester.
  mockAuth.mockResolvedValue({
    user: { id: REQUESTER_ID, email: "alice@example.com", role: "OWNER" },
  });
  // Rate limit always allows.
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60_000,
  });
  // Item is owned by the requester (assertOwnership passes).
  mockDebrisStatusFindUnique.mockResolvedValue({
    assessment: { userId: REQUESTER_ID },
  });
  // Audit + revalidate are no-ops.
  mockLogAuditEvent.mockResolvedValue(undefined);
  mockRevalidatePath.mockReturnValue(undefined);
});

// ─── delegateComplianceItem ─────────────────────────────────────────

describe("delegateComplianceItem", () => {
  beforeEach(() => {
    // Default: assignee is in the same org as requester.
    mockOrgMemberFindFirst.mockResolvedValue({
      organizationId: SHARED_ORG_ID,
    });
    mockUserFindUnique.mockResolvedValue({
      name: "Bob Builder",
      email: "bob@example.com",
    });
    mockNotificationCreate.mockResolvedValue({ id: "notif_1" });
    mockComplianceItemNoteCreate.mockResolvedValue({ id: "note_1" });
  });

  it("happy path: writes Notification + audit-trail Note", async () => {
    await delegateComplianceItem.call({
      itemId: ITEM_ID,
      assigneeUserId: ASSIGNEE_ID,
      reason: "Please upload the latest collision-avoidance log",
    });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockComplianceItemNoteCreate).toHaveBeenCalledTimes(1);
    // Audit verb fires.
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "comply_v2_item_delegated",
        entityType: "comply_compliance_item",
      }),
    );
  });

  it("notification.actionUrl points to the item-detail route", async () => {
    await delegateComplianceItem.call({
      itemId: ITEM_ID,
      assigneeUserId: ASSIGNEE_ID,
      reason: "Needs your eyes — supplier just sent updated cert",
    });
    const call = mockNotificationCreate.mock.calls[0][0];
    expect(call.data.actionUrl).toBe(`/dashboard/items/DEBRIS/${ROW_ID}`);
    expect(call.data.userId).toBe(ASSIGNEE_ID);
    expect(call.data.type).toBe("COMPLIANCE_ACTION_REQUIRED");
  });

  it("rejects self-delegation", async () => {
    await expect(
      delegateComplianceItem.call({
        itemId: ITEM_ID,
        assigneeUserId: REQUESTER_ID,
        reason: "Trying to delegate to myself which makes no sense",
      }),
    ).rejects.toThrow(/yourself/i);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant assignee (no shared org)", async () => {
    mockOrgMemberFindFirst.mockResolvedValue(null);
    await expect(
      delegateComplianceItem.call({
        itemId: ITEM_ID,
        assigneeUserId: "user_outsider",
        reason: "Pinging someone outside my org should fail hard",
      }),
    ).rejects.toThrow(/your organization/i);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});

// ─── attachDocumentToItem ───────────────────────────────────────────

describe("attachDocumentToItem", () => {
  const DOC_ID = "doc_collision_log_2026";

  beforeEach(() => {
    mockComplianceItemNoteCreate.mockResolvedValue({ id: "note_1" });
  });

  it("happy path with user-owned doc → writes structured citation note", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      name: "Collision Avoidance Log Q1",
      fileName: "collision-q1.pdf",
      userId: REQUESTER_ID,
      organizationId: null,
    });

    await attachDocumentToItem.call({
      itemId: ITEM_ID,
      documentId: DOC_ID,
    });

    expect(mockComplianceItemNoteCreate).toHaveBeenCalledTimes(1);
    const noteCall = mockComplianceItemNoteCreate.mock.calls[0][0];
    expect(noteCall.data.body).toContain("Attached evidence");
    expect(noteCall.data.body).toContain("Collision Avoidance Log Q1");
    expect(noteCall.data.body).toContain("collision-q1.pdf");
    // No org-membership check needed when user owns the doc.
    expect(mockOrgMemberFindFirst).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "comply_v2_item_evidence_attached",
      }),
    );
  });

  it("allows org-shared doc uploaded by a different user", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      name: "Shared Org Cert",
      fileName: "cert.pdf",
      userId: "user_other_member",
      organizationId: SHARED_ORG_ID,
    });
    mockOrgMemberFindFirst.mockResolvedValue({ id: "membership_x" });

    await attachDocumentToItem.call({
      itemId: ITEM_ID,
      documentId: DOC_ID,
    });

    expect(mockComplianceItemNoteCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects foreign-org doc", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      name: "Hostile Org Cert",
      fileName: "hostile.pdf",
      userId: "user_outsider",
      organizationId: "org_someone_else",
    });
    mockOrgMemberFindFirst.mockResolvedValue(null); // no shared membership

    await expect(
      attachDocumentToItem.call({
        itemId: ITEM_ID,
        documentId: DOC_ID,
      }),
    ).rejects.toThrow(/your organization/i);
    expect(mockComplianceItemNoteCreate).not.toHaveBeenCalled();
  });
});
