/**
 * Bulk-Erfassung Kontakte — Gate-, Cap-, E-Mail-Dedup- und
 * find-or-create-Pins. Muster: from-lead/route.test.ts.
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
    crmContact: { findMany: vi.fn(), create: vi.fn() },
    crmCompany: { findFirst: vi.fn(), create: vi.fn() },
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
  return new Request("http://localhost/api/admin/crm/contacts/bulk", {
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
  vi.mocked(prisma.crmContact.findMany).mockResolvedValue([] as never);
  let contactSeq = 0;
  vi.mocked(prisma.crmContact.create).mockImplementation((() =>
    Promise.resolve({ id: `contact-${++contactSeq}` })) as never);
  vi.mocked(prisma.crmCompany.findFirst).mockResolvedValue(null as never);
  let companySeq = 0;
  vi.mocked(prisma.crmCompany.create).mockImplementation((() =>
    Promise.resolve({ id: `comp-${++companySeq}` })) as never);
  vi.mocked(prisma.crmNote.createMany).mockResolvedValue({
    count: 0,
  } as never);
  vi.mocked(prisma.crmActivity.createMany).mockResolvedValue({
    count: 0,
  } as never);
});

describe("POST /api/admin/crm/contacts/bulk", () => {
  it("401 ohne Session — kein Schreibzugriff", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq({ contacts: [{ name: "Max Muster" }] }));
    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.crmContact.create)).not.toHaveBeenCalled();
  });

  it("403 wenn kein Super-Admin und requireRole ablehnt", async () => {
    vi.mocked(isSuperAdmin).mockReturnValue(false);
    const err = new Error("nope");
    err.name = "ForbiddenError";
    vi.mocked(requireRole).mockRejectedValue(err);
    const res = await POST(makeReq({ contacts: [{ name: "Max Muster" }] }));
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.crmContact.create)).not.toHaveBeenCalled();
  });

  it("400 bei kaputtem Body (fehlendes Array / ungültige E-Mail)", async () => {
    expect((await POST(makeReq({}))).status).toBe(400);
    expect(
      (
        await POST(
          makeReq({ contacts: [{ name: "Max", email: "keine-email" }] }),
        )
      ).status,
    ).toBe(400);
  });

  it("400 bei mehr als 100 Kontakten (Cap)", async () => {
    const contacts = Array.from({ length: 101 }, (_, i) => ({
      name: `Person ${i}`,
    }));
    expect((await POST(makeReq({ contacts }))).status).toBe(400);
    expect(vi.mocked(prisma.crmContact.create)).not.toHaveBeenCalled();
  });

  it("überspringt vorhandene E-Mails + Batch-Duplikate; ohne E-Mail wird immer angelegt", async () => {
    vi.mocked(prisma.crmContact.findMany).mockResolvedValue([
      { email: "anna@kanzlei.de" },
    ] as never);

    const res = await POST(
      makeReq({
        contacts: [
          { name: "Anna Alt", email: "Anna@Kanzlei.de" }, // existiert (lowercased)
          { name: "Ben Neu", email: "ben@kanzlei.de" },
          { name: "Ben Doppelt", email: "BEN@kanzlei.de" }, // Batch-Duplikat
          { name: "Carla OhneMail" }, // kein Dedup-Schlüssel → anlegen
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      created: number;
      skipped: string[];
      createdIds: string[];
    };
    expect(json.created).toBe(2);
    expect(json.skipped).toEqual(["Anna Alt", "Ben Doppelt"]);
    expect(json.createdIds).toHaveLength(2);
    expect(vi.mocked(prisma.crmContact.create)).toHaveBeenCalledTimes(2);
  });

  it("Happy Path: Name-Split, Firma find-or-create mit Batch-Cache, Notiz, LEAD-Default", async () => {
    vi.mocked(prisma.crmCompany.findFirst)
      .mockResolvedValueOnce({ id: "comp-existing" } as never) // "Kanzlei Müller" existiert
      .mockResolvedValue(null as never);

    const res = await POST(
      makeReq({
        contacts: [
          {
            name: "Dr. Anna Schmidt",
            email: "anna@example.com",
            companyName: "Kanzlei Müller",
            note: "ILA-Messe kennengelernt",
          },
          { name: "Weber", companyName: "Neue Kanzlei" },
          { name: "Tim Tester", companyName: "neue kanzlei" }, // Cache-Hit
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { created: number; skipped: string[] };
    expect(json.created).toBe(3);
    expect(json.skipped).toEqual([]);

    // Name-Split: letztes Wort = Nachname, Rest = Vorname
    const calls = vi.mocked(prisma.crmContact.create).mock.calls;
    const first = calls[0][0] as {
      data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        companyId?: string;
        lifecycleStage: string;
        sourceTags: string[];
      };
    };
    expect(first.data.firstName).toBe("Dr. Anna");
    expect(first.data.lastName).toBe("Schmidt");
    expect(first.data.email).toBe("anna@example.com");
    expect(first.data.companyId).toBe("comp-existing");
    expect(first.data.lifecycleStage).toBe("LEAD");
    expect(first.data.sourceTags).toContain("bulk");

    const second = calls[1][0] as {
      data: { firstName?: string; lastName?: string; companyId?: string };
    };
    expect(second.data.firstName).toBeUndefined();
    expect(second.data.lastName).toBe("Weber");
    expect(second.data.companyId).toBe("comp-1"); // neu angelegt

    // Batch-Cache: "neue kanzlei" trifft den Cache → nur EIN company.create
    const third = calls[2][0] as { data: { companyId?: string } };
    expect(third.data.companyId).toBe("comp-1");
    expect(vi.mocked(prisma.crmCompany.create)).toHaveBeenCalledTimes(1);

    // Notiz als CrmNote am Kontakt
    const noteArgs = vi.mocked(prisma.crmNote.createMany).mock.calls[0][0] as {
      data: Array<{ body: string; authorId: string; contactId: string }>;
    };
    expect(noteArgs.data).toEqual([
      {
        body: "ILA-Messe kennengelernt",
        authorId: "admin-1",
        contactId: "contact-1",
      },
    ]);
  });
});
