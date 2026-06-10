/**
 * Tests for GET /api/assessment/v2/pdf/dossier (plan Task 3.4).
 *
 * PURE/MOCKED unit tests — auth, Prisma, the rate limiter, the logger and
 * the PDF builder are mocked (the sibling pdf/quick + calculate pattern).
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Route contract exercised:
 *   1. ACCOUNT GATE — 401 without a session, before any rate-limit or DB
 *      access (the full tier sits behind an account).
 *   2. RATE-LIMIT WIRING — the `export` tier keyed per user; 429
 *      short-circuits before any DB read.
 *   3. OWNERSHIP, ONE 404 — a missing profile, a FOREIGN profile and an
 *      unclaimed ANONYMOUS profile (userId null) are the SAME 404
 *      (no enumeration); the gate applies to the JSON variant too.
 *   4. STORED FULL SNAPSHOT ONLY — only `tier: "FULL"` snapshots are
 *      consulted, newest first; none yet → 404. Nothing is ever recomputed
 *      and no client-supplied answers are accepted.
 *   5. STALENESS GUARD — profile.version ≠ snapshot.profileVersion → 409
 *      (the echo must be the answers the verdict was computed from).
 *   6. PDF RESPONSE — the builder receives the stored result + stored
 *      answers VERBATIM; application/pdf + Content-Disposition + the
 *      self-attesting hash header.
 *   7. JSON EXPORT (`?format=json`) — the stored snapshot result + answers
 *      echo + rulebook block; no PDF builder involved.
 *   8. FAILURE HONESTY — a builder throw is an honest 500.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RULEBOOK } from "@/data/assessment/rulebook";

// ── Mocks (declared before the route is dynamically imported) ──

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

const profileFindUniqueMock = vi.fn();
const snapshotFindFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorAssessmentProfile: {
      findUnique: (args: unknown) => profileFindUniqueMock(args),
    },
    assessmentVerdictSnapshot: {
      findFirst: (args: unknown) => snapshotFindFirstMock(args),
    },
  },
}));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (tier: string, id: string) => checkRateLimitMock(tier, id),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const buildPdfMock = vi.fn();
vi.mock("@/lib/pdf/assessment/obligation-dossier.server", () => ({
  buildObligationDossierPdf: (
    result: unknown,
    answers: unknown,
    recipient: unknown,
    provenance: unknown,
  ) => buildPdfMock(result, answers, recipient, provenance),
}));

// ── Fixtures ──

const STORED_RESULT = {
  rulebookVersion: "1.0.0",
  marker: "stored-full-result",
};
const STORED_ANSWERS = {
  q1_1_roles: { state: "answered", value: ["spacecraft_operator"] },
  q4_8_launching_state: { state: "unsure" },
};
const SNAPSHOT_CREATED_AT = new Date("2026-06-10T12:00:00.000Z");

function req(query: string): Request {
  return new Request(`http://localhost/api/assessment/v2/pdf/dossier${query}`, {
    method: "GET",
  });
}

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  authMock.mockReset().mockResolvedValue({
    user: { id: "user_1", name: "Ada Lovelace", email: "ada@startup.space" },
  });
  profileFindUniqueMock.mockReset().mockResolvedValue({
    id: "prof_1",
    userId: "user_1",
    version: 3,
    answers: STORED_ANSWERS,
  });
  snapshotFindFirstMock.mockReset().mockResolvedValue({
    id: "snap_1",
    profileId: "prof_1",
    profileVersion: 3,
    tier: "FULL",
    rulebookVersion: "1.0.0",
    result: STORED_RESULT,
    unknownsCount: 2,
    createdAt: SNAPSHOT_CREATED_AT,
  });
  checkRateLimitMock.mockReset().mockResolvedValue({
    success: true,
    remaining: 19,
    reset: Date.now() + 3_600_000,
    limit: 20,
  });
  buildPdfMock.mockReset().mockReturnValue({
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), // "%PDF-"
    contentHash: "ab".repeat(32),
    filename: "caelex-obligation-dossier-2026-06-10.pdf",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account gate
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — account gate", () => {
  it("returns 401 without a session — before any rate-limit or DB access", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(401);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit wiring (export tier)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — rate limit", () => {
  it("uses the `export` tier keyed per user and returns 429 before any DB read", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      limit: 20,
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith("export", "user:user_1");
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
    expect(snapshotFindFirstMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — input validation", () => {
  it("returns 400 when profileId is missing", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("") as never);

    expect(res.status).toBe(400);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 on an unknown format value", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1&format=docx") as never);

    expect(res.status).toBe(400);
    expect(buildPdfMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ownership — one 404, no enumeration
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — ownership", () => {
  it("returns 404 for a missing profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_x") as never);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Not found");
    expect(snapshotFindFirstMock).not.toHaveBeenCalled();
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("returns the SAME 404 for a FOREIGN profile (userId mismatch)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      userId: "someone_else",
      version: 3,
      answers: STORED_ANSWERS,
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Not found");
    expect(snapshotFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns the SAME 404 for an unclaimed ANONYMOUS profile (userId null)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      userId: null,
      version: 3,
      answers: STORED_ANSWERS,
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(404);
    expect(snapshotFindFirstMock).not.toHaveBeenCalled();
  });

  it("enforces the SAME ownership gate on the JSON variant", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      userId: "someone_else",
      version: 3,
      answers: STORED_ANSWERS,
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1&format=json") as never);

    expect(res.status).toBe(404);
    expect(snapshotFindFirstMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stored FULL snapshot only
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — stored snapshot", () => {
  it("returns 404 when no FULL verdict snapshot exists yet", async () => {
    snapshotFindFirstMock.mockResolvedValue(null);
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/No full assessment result/i);
    expect(buildPdfMock).not.toHaveBeenCalled();
  });

  it("consults ONLY FULL-tier snapshots, newest first", async () => {
    const { GET } = await loadRoute();
    await GET(req("?profileId=prof_1") as never);

    const args = snapshotFindFirstMock.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(args.where).toMatchObject({ profileId: "prof_1", tier: "FULL" });
    expect(args.orderBy).toMatchObject({ createdAt: "desc" });
  });

  it("refuses with 409 when answers changed since the verdict was computed (version mismatch)", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "prof_1",
      userId: "user_1",
      version: 4, // bumped after the snapshot was computed
      answers: STORED_ANSWERS,
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/recalculate before exporting/i);
    expect(buildPdfMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF response — read-only composition of the stored substrate
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — PDF response", () => {
  it("hands the STORED result + STORED answers to the builder verbatim — nothing recomputed", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(200);
    expect(buildPdfMock).toHaveBeenCalledTimes(1);
    const [result, answers, recipient, provenance] = buildPdfMock.mock.calls[0];
    expect(result).toBe(STORED_RESULT);
    expect(answers).toBe(STORED_ANSWERS);
    expect(recipient).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@startup.space",
    });
    expect(provenance).toMatchObject({
      snapshotId: "snap_1",
      profileVersion: 3,
    });
  });

  it("returns application/pdf with Content-Disposition and the self-attesting hash header", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      'attachment; filename="caelex-obligation-dossier-2026-06-10.pdf"',
    );
    expect(res.headers.get("X-Caelex-Dossier-Hash")).toBe("ab".repeat(32));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns an honest 500 when the builder refuses (unrecognizable stored result)", async () => {
    buildPdfMock.mockImplementation(() => {
      throw new Error(
        "obligation-dossier: stored verdict result is unrecognizable — refusing to fabricate a document.",
      );
    });
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1") as never);

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect((await res.json()).error).toMatch(/Failed to generate/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JSON export — stored result + answers echo + rulebook block
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/assessment/v2/pdf/dossier — JSON export", () => {
  it("returns the stored snapshot result + answers echo + rulebook block — no PDF builder involved", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1&format=json") as never);

    expect(res.status).toBe(200);
    expect(buildPdfMock).not.toHaveBeenCalled();

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.format).toBe("caelex-obligation-dossier-json-v1");
    // The stored result, verbatim.
    expect(body.result).toEqual(STORED_RESULT);
    // The answers echo — tri-state states preserved, never coerced.
    expect(body.answers).toEqual(STORED_ANSWERS);
    // Snapshot provenance.
    expect(body.snapshot).toMatchObject({
      id: "snap_1",
      profileId: "prof_1",
      profileVersion: 3,
      tier: "FULL",
      rulebookVersion: "1.0.0",
      createdAt: SNAPSHOT_CREATED_AT.toISOString(),
    });
    // The rulebook block: semver + EVERY source with its as-of date.
    const rulebook = body.rulebook as {
      version: string;
      sources: { label: string; asOf: string }[];
    };
    expect(rulebook.version).toBe(RULEBOOK.version);
    expect(rulebook.sources.length).toBe(RULEBOOK.sources.length);
    for (const src of rulebook.sources) {
      expect(src.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("serves the JSON as a download with no-store caching", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("?profileId=prof_1&format=json") as never);

    expect(res.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="caelex-obligation-dossier-\d{4}-\d{2}-\d{2}\.json"/,
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
