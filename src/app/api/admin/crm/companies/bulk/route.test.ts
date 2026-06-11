/**
 * Bulk-Erfassung Firmen — Gate-, Cap- und Idempotenz-Pins.
 * Muster: from-lead/route.test.ts (gemockte Prisma-Flachmocks).
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
    crmCompany: { findMany: vi.fn(), create: vi.fn() },
    crmNote: { createMany: vi.fn() },
    crmActivity: { createMany: vi.fn() },
  },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { isSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/crm/companies/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "admin-1", email: "admin@caelex.eu" },
  } as never);
  vi.mocked(isSuperAdmin).mockReturnValue(true);
  vi.mocked(prisma.crmCompany.findMany).mockResolvedValue([] as never);
  let seq = 0;
  vi.mocked(prisma.crmCompany.create).mockImplementation((() =>
    Promise.resolve({ id: `comp-${++seq}` })) as never);
  vi.mocked(prisma.crmNote.createMany).mockResolvedValue({
    count: 0,
  } as never);
  vi.mocked(prisma.crmActivity.createMany).mockResolvedValue({
    count: 0,
  } as never);
});

describe("POST /api/admin/crm/companies/bulk", () => {
  it("401 ohne Session — kein Schreibzugriff", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq({ companies: [{ name: "A" }] }));
    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.crmCompany.create)).not.toHaveBeenCalled();
  });

  it("403 wenn kein Super-Admin und requireRole ablehnt", async () => {
    vi.mocked(isSuperAdmin).mockReturnValue(false);
    const err = new Error("nope");
    err.name = "ForbiddenError";
    vi.mocked(requireRole).mockRejectedValue(err);
    const res = await POST(makeReq({ companies: [{ name: "A" }] }));
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.crmCompany.create)).not.toHaveBeenCalled();
  });

  it("400 bei kaputtem Body (kein companies-Array / leeres Array / leerer Name)", async () => {
    expect((await POST(makeReq({}))).status).toBe(400);
    expect((await POST(makeReq({ companies: [] }))).status).toBe(400);
    expect((await POST(makeReq({ companies: [{ name: "   " }] }))).status).toBe(
      400,
    );
  });

  it("400 bei mehr als 100 Firmen (Cap)", async () => {
    const companies = Array.from({ length: 101 }, (_, i) => ({
      name: `Firma ${i}`,
    }));
    expect((await POST(makeReq({ companies }))).status).toBe(400);
    expect(vi.mocked(prisma.crmCompany.create)).not.toHaveBeenCalled();
  });

  it("überspringt vorhandene Firmen case-insensitive + Batch-Duplikate", async () => {
    vi.mocked(prisma.crmCompany.findMany).mockResolvedValue([
      { name: "Kanzlei Müller" },
    ] as never);

    const res = await POST(
      makeReq({
        companies: [
          { name: "KANZLEI MÜLLER" }, // existiert (case-insensitive)
          { name: "Neue Kanzlei" },
          { name: "neue kanzlei" }, // Duplikat im selben Batch
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      created: number;
      skipped: string[];
      createdIds: string[];
    };
    expect(json.created).toBe(1);
    expect(json.skipped).toEqual(["KANZLEI MÜLLER", "neue kanzlei"]);
    expect(json.createdIds).toHaveLength(1);
    expect(vi.mocked(prisma.crmCompany.create)).toHaveBeenCalledTimes(1);
  });

  it("Happy Path: legt an, normalisiert Website, hängt Notiz als CrmNote an", async () => {
    const res = await POST(
      makeReq({
        companies: [
          {
            name: "Kanzlei Schmidt",
            website: "kanzlei-schmidt.de",
            city: "München",
            note: "Empfehlung von Dr. Weber",
          },
          { name: "Raumfahrt Recht GmbH" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      created: number;
      skipped: string[];
      createdIds: string[];
    };
    expect(json).toEqual({
      created: 2,
      skipped: [],
      createdIds: ["comp-1", "comp-2"],
    });

    const firstCreate = vi.mocked(prisma.crmCompany.create).mock
      .calls[0][0] as {
      data: { name: string; website?: string; city?: string };
    };
    expect(firstCreate.data.name).toBe("Kanzlei Schmidt");
    expect(firstCreate.data.website).toBe("https://kanzlei-schmidt.de");
    expect(firstCreate.data.city).toBe("München");

    // Notiz landet als CrmNote mit Autor an der Firma
    const noteArgs = vi.mocked(prisma.crmNote.createMany).mock.calls[0][0] as {
      data: Array<{ body: string; authorId: string; companyId: string }>;
    };
    expect(noteArgs.data).toEqual([
      {
        body: "Empfehlung von Dr. Weber",
        authorId: "admin-1",
        companyId: "comp-1",
      },
    ]);

    // Aktivität pro angelegter Firma
    const actArgs = vi.mocked(prisma.crmActivity.createMany).mock
      .calls[0][0] as { data: Array<{ companyId: string }> };
    expect(actArgs.data.map((a) => a.companyId)).toEqual(["comp-1", "comp-2"]);
  });
});
