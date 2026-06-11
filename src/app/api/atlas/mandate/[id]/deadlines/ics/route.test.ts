/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests für GET /api/atlas/mandate/[id]/deadlines/ics — Fristen als
 * iCalendar-Export. Pinnt:
 *   - Auth-Gates (401 ohne Session, 403 ohne Mandats-Membership)
 *   - Content-Type text/calendar + attachment-Disposition (Slug-Dateiname)
 *   - VEVENT-Struktur (Count, UID, all-day DTSTART/DTEND am Berliner Tag)
 *   - RFC-5545-TEXT-Escaping (Backslash/Semikolon/Komma/Newline)
 *   - CRLF-Zeilenenden + Line-Folding bei > 75 Oktetten
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/atlas/mandate-membership", () => ({
  checkMandateMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasMandate: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-id"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";
import { checkRateLimit } from "@/lib/ratelimit";

const mkReq = () =>
  new Request(
    "http://localhost/api/atlas/mandate/m1/deadlines/ics",
  ) as unknown as Parameters<typeof GET>[0];
const mkCtx = (id = "m1") => ({ params: Promise.resolve({ id }) });

const authed = () =>
  vi.mocked(getAtlasAuth).mockResolvedValue({
    userId: "u1",
    organizationId: "o1",
  } as never);

describe("GET /api/atlas/mandate/[id]/deadlines/ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAtlasAuth).mockResolvedValue(null);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(401);
    expect(prisma.atlasMandate.findUnique).not.toHaveBeenCalled();
  });

  it("returns 403 without mandate membership (org alone is NOT enough)", async () => {
    authed();
    vi.mocked(checkMandateMembership).mockResolvedValue(false);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(403);
    expect(checkMandateMembership).toHaveBeenCalledWith("m1", "u1", "o1");
    expect(prisma.atlasMandate.findUnique).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    authed();
    vi.mocked(checkMandateMembership).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: false,
      reset: Date.now() + 30_000,
    } as never);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(429);
  });

  it("returns 404 when the mandate vanished between checks", async () => {
    authed();
    vi.mocked(checkMandateMembership).mockResolvedValue(true);
    vi.mocked(prisma.atlasMandate.findUnique).mockResolvedValue(null as never);
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(404);
  });

  describe("happy path", () => {
    const LONG_TITLE =
      "Sehr lange Einspruchsfrist gegen den Bescheid der Bundesnetzagentur über die Frequenzzuteilung für die Satellitenkonstellation";

    beforeEach(() => {
      authed();
      vi.mocked(checkMandateMembership).mockResolvedValue(true);
      vi.mocked(prisma.atlasMandate.findUnique).mockResolvedValue({
        name: "Müller & Söhne GbR",
        deadlines: [
          {
            id: "d1",
            title: "Frist, mit; Backslash\\ drin",
            description: "Zeile 1\nZeile 2",
            /* 23:59:59 Berlin im Sommer (+02:00) → Berliner Tag 15.07. */
            dueAt: new Date("2026-07-15T21:59:59.000Z"),
            url: "https://portal.bnetza.de/verfahren?id=1,2;3",
          },
          {
            id: "d2",
            title: LONG_TITLE,
            description: null,
            /* 23:59:59 Berlin im Winter (+01:00) → Berliner Tag 10.01. */
            dueAt: new Date("2026-01-10T22:59:59.000Z"),
            url: null,
          },
        ],
      } as never);
    });

    it("responds with text/calendar + attachment disposition (slug filename)", async () => {
      const res = await GET(mkReq(), mkCtx());
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "text/calendar; charset=utf-8",
      );
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="atlas-fristen-mueller-soehne-gbr.ics"',
      );
      /* Nur offene Fristen werden geladen. */
      expect(prisma.atlasMandate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "m1" },
          select: expect.objectContaining({
            deadlines: expect.objectContaining({
              where: { status: "open" },
            }),
          }),
        }),
      );
    });

    it("emits one VEVENT per open deadline with UID + all-day Berlin dates", async () => {
      const res = await GET(mkReq(), mkCtx());
      const body = await res.text();

      expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(2);
      expect(body.match(/END:VEVENT/g)).toHaveLength(2);
      expect(body).toContain("BEGIN:VCALENDAR");
      expect(body).toContain("PRODID:-//Caelex//Atlas//DE");
      expect(body).toContain("METHOD:PUBLISH");
      expect(body).toContain("UID:d1@caelex.eu");
      expect(body).toContain("UID:d2@caelex.eu");
      /* All-day am Berliner Kalendertag, DTEND = Folgetag (exklusiv). */
      expect(body).toContain("DTSTART;VALUE=DATE:20260715");
      expect(body).toContain("DTEND;VALUE=DATE:20260716");
      expect(body).toContain("DTSTART;VALUE=DATE:20260110");
      expect(body).toContain("DTEND;VALUE=DATE:20260111");
      /* Jedes VEVENT braucht ein DTSTAMP (RFC 5545). */
      expect(body.match(/DTSTAMP:\d{8}T\d{6}Z/g)).toHaveLength(2);
    });

    it("escapes SUMMARY/DESCRIPTION per RFC 5545 (backslash, ; , newline)", async () => {
      const res = await GET(mkReq(), mkCtx());
      const body = await res.text();
      const unfolded = body.replace(/\r\n /g, "");

      expect(unfolded).toContain("SUMMARY:Frist\\, mit\\; Backslash\\\\ drin");
      expect(unfolded).toContain("DESCRIPTION:Zeile 1\\nZeile 2");
      /* URL ist VALUE=URI — bleibt unescaped, sonst zerstören wir die URI. */
      expect(unfolded).toContain(
        "URL:https://portal.bnetza.de/verfahren?id=1,2;3",
      );
    });

    it("uses CRLF line endings and folds physical lines at 75 octets", async () => {
      const res = await GET(mkReq(), mkCtx());
      const body = await res.text();

      /* CRLF überall: ohne \r darf kein \n vorkommen. */
      expect(body.endsWith("\r\n")).toBe(true);
      expect(body.replace(/\r\n/g, "")).not.toContain("\n");

      /* Keine physische Zeile über 75 UTF-8-Oktette. */
      const encoder = new TextEncoder();
      const physical = body.split("\r\n").filter((l) => l.length > 0);
      for (const line of physical) {
        expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
      }

      /* Der lange Titel wurde gefaltet (Folgezeile beginnt mit Space)
         und lässt sich per Unfolding verlustfrei rekonstruieren. */
      const summaryLine = physical.find((l) =>
        l.startsWith("SUMMARY:Sehr lange"),
      );
      expect(summaryLine).toBeDefined();
      const unfolded = body.replace(/\r\n /g, "");
      expect(unfolded).toContain(`SUMMARY:${LONG_TITLE}`);
    });
  });

  it("returns 500 with a generic message when the query throws", async () => {
    authed();
    vi.mocked(checkMandateMembership).mockResolvedValue(true);
    vi.mocked(prisma.atlasMandate.findUnique).mockRejectedValue(
      new Error("db down"),
    );
    const res = await GET(mkReq(), mkCtx());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Export failed");
  });
});
