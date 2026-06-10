/**
 * Trade daily digest (ILA review #9) — pure formatter pins + the cron
 * route's secret gate. DB-touching collection is covered by typecheck +
 * the route's behaviour in prod (cron logs).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { digestSubject, digestHtml, type OrgDigest } from "./digest.server";

const DIGEST: OrgDigest = {
  organizationId: "org-1",
  organizationName: "Demo Space GmbH",
  recipients: ["ceo@example.com"],
  openHits: [{ legalName: "Rosneft Oil Company", status: "POTENTIAL_MATCH" }],
  expiringLicenses: [
    {
      label: "BAFA-2026-001",
      validUntil: new Date("2026-07-01"),
      daysLeft: 21,
    },
  ],
  sagsHigh: [{ label: "AGG-12/2026", utilizationPct: 85 }],
};

describe("digestSubject", () => {
  it("lists only non-empty sections", () => {
    expect(digestSubject(DIGEST)).toBe(
      "Passage Digest: 1 Screening · 1 Lizenzen · 1 SAG — Handlungsbedarf",
    );
    expect(
      digestSubject({ ...DIGEST, expiringLicenses: [], sagsHigh: [] }),
    ).toBe("Passage Digest: 1 Screening — Handlungsbedarf");
  });
});

describe("digestHtml", () => {
  it("contains every open item, the cockpit link, and the honesty note", () => {
    const html = digestHtml(DIGEST, "https://www.caelex.eu");
    expect(html).toContain("Rosneft Oil Company");
    expect(html).toContain("möglicher Treffer");
    expect(html).toContain("BAFA-2026-001");
    expect(html).toContain("in 21 Tagen");
    expect(html).toContain("AGG-12/2026");
    expect(html).toContain("85% des Wertrahmens");
    expect(html).toContain("https://www.caelex.eu/trade");
    expect(html).toContain("täglich");
  });

  it("escapes HTML in entity names", () => {
    const html = digestHtml(
      {
        ...DIGEST,
        openHits: [
          { legalName: "<script>x</script>", status: "CONFIRMED_HIT" },
        ],
      },
      "https://www.caelex.eu",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("cron route gate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("401 without the bearer secret, 503 without env", async () => {
    vi.doMock("@/lib/trade/digest.server", () => ({
      runTradeDigest: vi
        .fn()
        .mockResolvedValue({ orgsScanned: 0, emailsSent: 0, skipped: 0 }),
    }));
    const { GET } = await import("@/app/api/cron/trade-digest/route");

    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "s3cret";
    const unauthorized = await GET(
      new Request("http://localhost/api/cron/trade-digest"),
    );
    expect(unauthorized.status).toBe(401);

    const ok = await GET(
      new Request("http://localhost/api/cron/trade-digest", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );
    expect(ok.status).toBe(200);

    delete process.env.CRON_SECRET;
    const noEnv = await GET(
      new Request("http://localhost/api/cron/trade-digest"),
    );
    expect(noEnv.status).toBe(503);
    process.env.CRON_SECRET = prev;
  });
});
