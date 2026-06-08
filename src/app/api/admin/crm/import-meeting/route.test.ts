/**
 * Tests for POST /api/admin/crm/import-meeting — the admin gate + preview/commit
 * branches. The orchestration (buildPreview/commitImport) is mocked; this tests
 * that NO import work happens for an unauthenticated or non-admin caller.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: () => "Meeting import failed",
}));
vi.mock("@/lib/crm/meeting-import.server", () => ({
  buildPreview: vi.fn(),
  commitImport: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { buildPreview, commitImport } from "@/lib/crm/meeting-import.server";

type Fn = ReturnType<typeof vi.fn>;
const mAuth = auth as unknown as Fn;
const mRequireRole = requireRole as unknown as Fn;
const mBuildPreview = buildPreview as unknown as Fn;
const mCommit = commitImport as unknown as Fn;

function req(body: unknown): Request {
  return new Request("https://app.caelex.com/api/admin/crm/import-meeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mRequireRole.mockResolvedValue({ id: "u1", role: "admin" });
});

describe("POST /api/admin/crm/import-meeting", () => {
  it("401 when unauthenticated — no import work", async () => {
    mAuth.mockResolvedValue(null);
    const res = await POST(req({ mode: "preview", transcript: "x" }) as never);
    expect(res.status).toBe(401);
    expect(mBuildPreview).not.toHaveBeenCalled();
  });

  it("403 when requireRole throws ForbiddenError — no import work", async () => {
    mAuth.mockResolvedValue({ user: { id: "u1" } });
    const err = new Error("nope");
    err.name = "ForbiddenError";
    mRequireRole.mockRejectedValue(err);
    const res = await POST(req({ mode: "preview", transcript: "x" }) as never);
    expect(res.status).toBe(403);
    expect(mBuildPreview).not.toHaveBeenCalled();
  });

  it("allows a super-admin even when requireRole would reject (owner bypass)", async () => {
    // julian@caelex.eu is in the hardcoded super-admin base, so isSuperAdmin
    // (the REAL module, unmocked) returns true and requireRole is never called.
    mAuth.mockResolvedValue({ user: { id: "u1", email: "julian@caelex.eu" } });
    const err = new Error("nope");
    err.name = "ForbiddenError";
    mRequireRole.mockRejectedValue(err);
    mBuildPreview.mockResolvedValue({
      contacts: [],
      summary: "s",
      noteBody: "s",
      actionItems: [],
      meetingTitle: null,
      meetingDate: null,
    });
    const res = await POST(req({ mode: "preview", transcript: "hi" }) as never);
    expect(res.status).toBe(200);
    expect(mRequireRole).not.toHaveBeenCalled();
    expect(mBuildPreview).toHaveBeenCalled();
  });

  it("400 on an invalid body", async () => {
    mAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ mode: "nonsense" }) as never);
    expect(res.status).toBe(400);
  });

  it("200 preview returns buildPreview's result", async () => {
    mAuth.mockResolvedValue({ user: { id: "u1" } });
    mBuildPreview.mockResolvedValue({
      contacts: [],
      summary: "s",
      noteBody: "s",
      actionItems: [],
      meetingTitle: null,
      meetingDate: null,
    });
    const res = await POST(
      req({ mode: "preview", transcript: "hello" }) as never,
    );
    expect(res.status).toBe(200);
    expect(mBuildPreview).toHaveBeenCalledWith("hello");
  });

  it("200 commit calls commitImport with the SESSION user as author", async () => {
    mAuth.mockResolvedValue({ user: { id: "author-9" } });
    mCommit.mockResolvedValue({
      contactsUpserted: 1,
      notesCreated: 1,
      tasksCreated: 0,
      dealCreated: false,
      activityId: "a",
    });
    const payload = {
      transcript: "t",
      summary: "s",
      noteBody: "s",
      contacts: [
        {
          name: "Ada",
          email: "ada@acme.io",
          company: null,
          title: null,
          matchedContactId: null,
        },
      ],
      actionItemsAsTasks: [],
      createDeal: false,
    };
    const res = await POST(req({ mode: "commit", payload }) as never);
    expect(res.status).toBe(200);
    // author id comes from the session, NEVER the body.
    expect(mCommit).toHaveBeenCalledWith(payload, "author-9");
  });
});
