/**
 * Unit tests for the meeting → CRM orchestration (buildPreview / commitImport).
 * Prisma, the LLM extraction, and the auto-link upserts are all mocked — this
 * tests the matching + write SHAPING, not the DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("./ai.server", () => ({ extractMeetingContacts: vi.fn() }));
vi.mock("./auto-link.server", () => ({
  upsertCompany: vi.fn(),
  upsertContact: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmContact: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    crmActivity: { create: vi.fn() },
    crmNote: { create: vi.fn() },
    crmTask: { create: vi.fn() },
    crmDeal: { create: vi.fn() },
  },
}));

import { buildPreview, commitImport } from "./meeting-import.server";
import { extractMeetingContacts } from "./ai.server";
import { upsertCompany, upsertContact } from "./auto-link.server";
import { prisma } from "@/lib/prisma";

type Fn = ReturnType<typeof vi.fn>;
const mExtract = extractMeetingContacts as unknown as Fn;
const mUpsertContact = upsertContact as unknown as Fn;
const mUpsertCompany = upsertCompany as unknown as Fn;
const p = prisma as unknown as Record<string, Record<string, Fn>>;

beforeEach(() => vi.clearAllMocks());

describe("buildPreview", () => {
  it("matches a known email, flags an unknown one as new, and bullets action items", async () => {
    mExtract.mockResolvedValue({
      meetingTitle: "Intro call",
      meetingDate: "2026-06-01",
      summary: "Discussed compliance.",
      attendees: [
        {
          name: "Ada Known",
          email: "ada@acme.io",
          company: "Acme",
          title: "CTO",
        },
        { name: "Bo New", email: "bo@beta.io" },
      ],
      actionItems: ["Send the whitepaper", "Schedule a demo"],
    });
    p.crmContact.findUnique.mockImplementation(
      ({ where }: { where: { email: string } }) =>
        where.email === "ada@acme.io"
          ? Promise.resolve({ id: "c-ada" })
          : Promise.resolve(null),
    );

    const preview = await buildPreview("transcript");
    expect(preview.contacts).toHaveLength(2);
    expect(preview.contacts[0]).toMatchObject({
      email: "ada@acme.io",
      matchedContactId: "c-ada",
    });
    expect(preview.contacts[1]).toMatchObject({
      email: "bo@beta.io",
      matchedContactId: null,
    });
    expect(preview.noteBody).toContain("Send the whitepaper");
    expect(preview.noteBody).toContain("Action items:");
  });

  it("drops a malformed email to null and never tries to match it", async () => {
    mExtract.mockResolvedValue({
      summary: "s",
      attendees: [{ name: "X", email: "not-an-email" }],
      actionItems: [],
    });
    const preview = await buildPreview("t");
    expect(preview.contacts[0].email).toBeNull();
    expect(p.crmContact.findUnique).not.toHaveBeenCalled();
  });
});

describe("commitImport", () => {
  const base = {
    transcript: "full transcript",
    meetingTitle: "Intro",
    meetingDate: "2026-06-01",
    summary: "Discussed.",
    noteBody: "Discussed.\n\nAction items:\n- Send wp",
    actionItemsAsTasks: ["Send wp"],
    createDeal: false,
  };

  it("upserts emailed contacts, creates no-email contacts, writes 1 MEETING_HELD activity + notes + tasks", async () => {
    mUpsertContact.mockResolvedValue({ id: "c-1" });
    mUpsertCompany.mockResolvedValue({ id: "co-1" });
    p.crmContact.create.mockResolvedValue({ id: "c-2" });
    p.crmContact.update.mockResolvedValue({});
    p.crmActivity.create.mockResolvedValue({ id: "act-1" });
    p.crmNote.create.mockResolvedValue({});
    p.crmTask.create.mockResolvedValue({});

    const result = await commitImport(
      {
        ...base,
        contacts: [
          {
            name: "Ada",
            email: "ada@acme.io",
            company: "Acme",
            title: "CTO",
            matchedContactId: null,
          },
          {
            name: "Bo",
            email: null,
            company: null,
            title: null,
            matchedContactId: null,
          },
        ],
      },
      "author-1",
    );

    expect(mUpsertContact).toHaveBeenCalledTimes(1); // the emailed contact
    expect(p.crmContact.create).toHaveBeenCalledTimes(1); // the no-email contact
    expect(p.crmActivity.create).toHaveBeenCalledTimes(1);
    const act = p.crmActivity.create.mock.calls[0][0].data;
    expect(act.type).toBe("MEETING_HELD");
    expect(act.body).toBe("full transcript");
    expect(act.userId).toBe("author-1");
    expect(p.crmNote.create).toHaveBeenCalledTimes(2);
    expect(p.crmTask.create).toHaveBeenCalledTimes(1);
    expect(p.crmDeal.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      contactsUpserted: 2,
      notesCreated: 2,
      tasksCreated: 1,
      dealCreated: false,
      activityId: "act-1",
    });
  });

  it("creates a deal only when createDeal AND the primary contact has a company", async () => {
    mUpsertContact.mockResolvedValue({ id: "c-1" });
    mUpsertCompany.mockResolvedValue({ id: "co-1" });
    p.crmContact.update.mockResolvedValue({});
    p.crmActivity.create.mockResolvedValue({ id: "act-1" });
    p.crmNote.create.mockResolvedValue({});
    p.crmContact.findUnique.mockResolvedValue({ companyId: "co-1" });
    p.crmDeal.create.mockResolvedValue({ id: "d-1" });

    const result = await commitImport(
      {
        ...base,
        createDeal: true,
        actionItemsAsTasks: [],
        contacts: [
          {
            name: "Ada",
            email: "ada@acme.io",
            company: "Acme",
            title: null,
            matchedContactId: null,
          },
        ],
      },
      "author-1",
    );
    expect(p.crmDeal.create).toHaveBeenCalledTimes(1);
    expect(result.dealCreated).toBe(true);
  });

  it("skips the deal when the primary contact has no company", async () => {
    mUpsertContact.mockResolvedValue({ id: "c-1" });
    p.crmContact.update.mockResolvedValue({});
    p.crmActivity.create.mockResolvedValue({ id: "act-1" });
    p.crmNote.create.mockResolvedValue({});
    p.crmContact.findUnique.mockResolvedValue({ companyId: null });

    const result = await commitImport(
      {
        ...base,
        createDeal: true,
        actionItemsAsTasks: [],
        contacts: [
          {
            name: "Ada",
            email: "ada@acme.io",
            company: null,
            title: null,
            matchedContactId: null,
          },
        ],
      },
      "author-1",
    );
    expect(p.crmDeal.create).not.toHaveBeenCalled();
    expect(result.dealCreated).toBe(false);
  });
});
