/**
 * from-lead conversion (CRM Phase 3) — gate + idempotent-merge pins.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: vi.fn(() => true) }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentLead: { findUnique: vi.fn() },
    crmCompany: { findFirst: vi.fn(), create: vi.fn() },
    crmContact: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    crmActivity: { create: vi.fn() },
  },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LEAD = {
  id: "claaaaaaaaaaaaaaaaaaaaaa1",
  email: "CEO@Example.com",
  company: "Demo Space GmbH",
  role: "CEO",
  assessmentType: "quick-check",
  source: "ila2026",
};

import type { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/crm/contacts/from-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "admin-1", email: "admin@caelex.eu" },
  } as never);
  vi.mocked(prisma.assessmentLead.findUnique).mockResolvedValue(LEAD as never);
  vi.mocked(prisma.crmCompany.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.crmCompany.create).mockResolvedValue({
    id: "comp-1",
  } as never);
  vi.mocked(prisma.crmContact.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.crmContact.create).mockResolvedValue({
    id: "contact-1",
  } as never);
  vi.mocked(prisma.crmContact.update).mockClear();
  vi.mocked(prisma.crmActivity.create).mockClear();
});

describe("from-lead", () => {
  it("no session → 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await POST(makeReq({ leadId: LEAD.id }))).status).toBe(401);
  });

  it("creates contact + company, lowercases email, carries the source tag", async () => {
    const res = await POST(makeReq({ leadId: LEAD.id }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { contactId: string; created: boolean };
    expect(json).toEqual({ contactId: "contact-1", created: true });

    const createArgs = vi.mocked(prisma.crmContact.create).mock.calls[0][0];
    expect(createArgs.data.email).toBe("ceo@example.com");
    expect(createArgs.data.sourceTags).toContain("ila2026");
    expect(createArgs.data.companyId).toBe("comp-1");
    expect(vi.mocked(prisma.crmActivity.create)).toHaveBeenCalled();
  });

  it("existing contact → idempotent merge, no duplicate, no new activity", async () => {
    vi.mocked(prisma.crmContact.findUnique).mockResolvedValue({
      id: "contact-9",
      sourceTags: ["website"],
      companyId: null,
    } as never);
    vi.mocked(prisma.crmContact.update).mockResolvedValue({
      id: "contact-9",
    } as never);

    const res = await POST(makeReq({ leadId: LEAD.id }));
    const json = (await res.json()) as { contactId: string; created: boolean };
    expect(json).toEqual({ contactId: "contact-9", created: false });

    const updateArgs = vi.mocked(prisma.crmContact.update).mock.calls[0][0];
    expect(updateArgs.data.sourceTags).toEqual(
      expect.arrayContaining(["website", "ila2026"]),
    );
    expect(updateArgs.data.companyId).toBe("comp-1"); // backfilled
    expect(vi.mocked(prisma.crmContact.create)).not.toHaveBeenCalled();
  });

  it("unknown lead → 404", async () => {
    vi.mocked(prisma.assessmentLead.findUnique).mockResolvedValue(
      null as never,
    );
    expect(
      (await POST(makeReq({ leadId: "clbbbbbbbbbbbbbbbbbbbbbb2" }))).status,
    ).toBe(404);
  });
});
