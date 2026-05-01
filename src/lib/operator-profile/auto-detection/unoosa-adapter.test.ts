/**
 * UNOOSA Adapter — unit tests.
 *
 * Heavy focus on the HTML parser (the most fragile part) plus the
 * standard adapter-contract coverage (canDetect, error paths).
 *
 * Coverage:
 *
 *   1. canDetect — gating on legalName length
 *   2. parseUnoosaHtml — happy path table parsing
 *   3. parseUnoosaHtml — empty / maintenance HTML
 *   4. parseUnoosaHtml — missing or moved table
 *   5. mapStateOfRegistryToIso2 — 3-letter UN codes, English names, raw ISO2
 *   6. stripHtml — entities, nested tags
 *   7. detect — empty result with warning
 *   8. detect — single record yields establishment
 *   9. detect — multiple records, all DEU → DE establishment
 *  10. detect — multiple records, mixed states → highest-frequency wins
 *  11. detect — error paths (rate-limit, 5xx, network, timeout, parse-error)
 */

import { describe, it, expect, vi } from "vitest";
import { unoosaAdapter, __test } from "./unoosa-adapter.server";

vi.mock("server-only", () => ({}));

const ORG_ID = "org_test_unoosa";

// ─── canDetect ─────────────────────────────────────────────────────────────

describe("unoosaAdapter.canDetect", () => {
  it("returns false when legalName is missing", () => {
    expect(unoosaAdapter.canDetect({ organizationId: ORG_ID })).toBe(false);
  });

  it("returns false when legalName too short", () => {
    expect(
      unoosaAdapter.canDetect({ organizationId: ORG_ID, legalName: "Sat" }),
    ).toBe(false);
  });

  it("returns true for legalName ≥ 4 chars", () => {
    expect(
      unoosaAdapter.canDetect({ organizationId: ORG_ID, legalName: "OneWeb" }),
    ).toBe(true);
  });
});

// ─── stripHtml helper ──────────────────────────────────────────────────────

describe("stripHtml", () => {
  it("removes simple tags and decodes entities", () => {
    expect(__test.stripHtml("Hello&nbsp;<b>World</b>")).toBe("Hello World");
    expect(__test.stripHtml("Tom&amp;Jerry")).toBe("Tom&Jerry");
    expect(__test.stripHtml("&#65;&#66;&#67;")).toBe("ABC");
  });

  it("collapses whitespace", () => {
    expect(__test.stripHtml("  multi   spaces  ")).toBe("multi spaces");
  });
});

// ─── mapStateOfRegistryToIso2 ──────────────────────────────────────────────

describe("mapStateOfRegistryToIso2", () => {
  const map = __test.mapStateOfRegistryToIso2;

  it("maps 3-letter UN codes", () => {
    expect(map("DEU")).toBe("DE");
    expect(map("FRA")).toBe("FR");
    expect(map("USA")).toBe("US");
    expect(map("ESA")).toBe("EU");
  });

  it("maps English country names", () => {
    expect(map("Germany")).toBe("DE");
    expect(map("UNITED KINGDOM")).toBe("GB");
    expect(map("United States of America")).toBe("US");
  });

  it("returns ISO2 unchanged when input is already alpha-2", () => {
    expect(map("DE")).toBe("DE");
    expect(map("fr")).toBe("FR");
  });

  it("returns null for unknown codes", () => {
    expect(map("XYZ")).toBeNull();
    expect(map("Atlantis")).toBeNull();
  });
});

// ─── parseUnoosaHtml ───────────────────────────────────────────────────────

describe("parseUnoosaHtml", () => {
  const parse = __test.parseUnoosaHtml;

  it("returns [] for HTML too short or maintenance pages", () => {
    expect(parse("")).toEqual([]);
    expect(parse("<html>x</html>")).toEqual([]);
    expect(
      parse(
        "<html><body>Service Unavailable. Try again later. ".padEnd(700, " ") +
          "</body></html>",
      ),
    ).toEqual([]);
  });

  it("returns [] when no Object-Name table present", () => {
    const html = "<html><body><p>nothing here</p></body></html>".padEnd(
      1000,
      " ",
    );
    expect(parse(html)).toEqual([]);
  });

  it("parses a single-row results table", () => {
    const html = padPage(`
      <table id="searchResults">
        <thead><tr><th>Object Name</th><th>International Designator</th><th>State of Registry</th><th>Launch Date</th><th>Function</th></tr></thead>
        <tbody>
          <tr><td>EUROBIRD-2</td><td>2001-021A</td><td>DEU</td><td>2001-04-23</td><td>Communications</td></tr>
        </tbody>
      </table>
    `);
    const records = parse(html);
    expect(records).toHaveLength(1);
    expect(records[0].objectName).toBe("EUROBIRD-2");
    expect(records[0].stateOfRegistry).toBe("DEU");
    expect(records[0].launchDate).toBe("2001-04-23");
    expect(records[0].function).toBe("Communications");
  });

  it("parses multiple rows", () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>Designator</th><th>State of Registry</th><th>Launch Date</th><th>Function</th></tr></thead>
        <tr><td>SAT-A</td><td>2020-001A</td><td>DEU</td><td>2020-01-01</td><td>Earth Observation</td></tr>
        <tr><td>SAT-B</td><td>2020-002A</td><td>FRA</td><td>2020-02-01</td><td>Communications</td></tr>
        <tr><td>SAT-C</td><td>2020-003A</td><td>DEU</td><td>2020-03-01</td><td>Communications</td></tr>
      </table>
    `);
    const records = parse(html);
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.stateOfRegistry)).toEqual([
      "DEU",
      "FRA",
      "DEU",
    ]);
  });

  it("ignores header rows (rows containing <th>)", () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>X</th><th>State of Registry</th></tr></thead>
        <tr><th>Header</th><th>shouldn't</th><th>match</th></tr>
        <tr><td>SAT-A</td><td>X</td><td>DEU</td></tr>
      </table>
    `);
    const records = parse(html);
    expect(records).toHaveLength(1);
    expect(records[0].objectName).toBe("SAT-A");
  });

  it("decodes HTML entities + strips inner tags from cells", () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>X</th><th>State of Registry</th></tr></thead>
        <tr><td><a href="x">SAT&nbsp;A&amp;B</a></td><td>X</td><td>DEU</td></tr>
      </table>
    `);
    const records = parse(html);
    expect(records).toHaveLength(1);
    expect(records[0].objectName).toBe("SAT A&B");
  });
});

// ─── detect — happy path ───────────────────────────────────────────────────

describe("unoosaAdapter.detect — happy path", () => {
  it("returns ok:true with warning when no records found", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        makeHtmlResponse(
          200,
          padPage(
            `<table><thead><tr><th>Object Name</th></tr></thead><tbody></tbody></table>`,
          ),
        ),
      );
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "ZeroSatCo",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("no records"),
    );
  });

  it("yields establishment when all matches share the same State", async () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>X</th><th>State of Registry</th><th>Launch Date</th><th>Function</th></tr></thead>
        <tr><td>EUROBIRD-1</td><td>X</td><td>DEU</td><td>2001-04-23</td><td>Communications</td></tr>
        <tr><td>EUROBIRD-2</td><td>X</td><td>DEU</td><td>2002-04-23</td><td>Communications</td></tr>
      </table>
    `);
    const fetchImpl = vi.fn().mockResolvedValue(makeHtmlResponse(200, html));
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Eurobird",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const fields = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    expect(fields.get("establishment")?.value).toBe("DE");
    // unanimous → confidence at the top of band
    expect(fields.get("establishment")?.confidence).toBeCloseTo(0.9, 2);
  });

  it("picks majority State when records are mixed", async () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>X</th><th>State of Registry</th></tr></thead>
        <tr><td>S1</td><td>X</td><td>FRA</td></tr>
        <tr><td>S2</td><td>X</td><td>DEU</td></tr>
        <tr><td>S3</td><td>X</td><td>DEU</td></tr>
      </table>
    `);
    const fetchImpl = vi.fn().mockResolvedValue(makeHtmlResponse(200, html));
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "MixedFleet",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const fields = new Map(outcome.result.fields.map((f) => [f.fieldName, f]));
    expect(fields.get("establishment")?.value).toBe("DE");
    // 2/3 → confidence around 0.7 + 0.67*0.2 = 0.83
    expect(fields.get("establishment")?.confidence).toBeGreaterThan(0.8);
    expect(fields.get("establishment")?.confidence).toBeLessThan(0.9);
  });

  it("surfaces function distribution in warnings", async () => {
    const html = padPage(`
      <table>
        <thead><tr><th>Object Name</th><th>X</th><th>State of Registry</th><th>Launch Date</th><th>Function</th></tr></thead>
        <tr><td>S1</td><td>X</td><td>DEU</td><td>2020-01-01</td><td>Earth Observation</td></tr>
        <tr><td>S2</td><td>X</td><td>DEU</td><td>2021-01-01</td><td>Communications</td></tr>
      </table>
    `);
    const fetchImpl = vi.fn().mockResolvedValue(makeHtmlResponse(200, html));
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "AcmeFleet",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("function"),
    );
    expect(outcome.result.warnings).toContainEqual(
      expect.stringContaining("launch-date range"),
    );
  });

  it("encodes legalName in the GET URL", async () => {
    const html = padPage(
      `<table><thead><tr><th>Object Name</th></tr></thead><tbody></tbody></table>`,
    );
    const fetchImpl = vi.fn().mockResolvedValue(makeHtmlResponse(200, html));
    await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "ACME & CO",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("objectName=");
    expect(url).toContain("%26"); // & encoded
  });
});

// ─── detect — error paths ──────────────────────────────────────────────────

describe("unoosaAdapter.detect — error paths", () => {
  it("returns missing-input when legalName absent", async () => {
    const outcome = await unoosaAdapter.detect({ organizationId: ORG_ID });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("missing-input");
  });

  it("returns rate-limited on HTTP 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "90" },
      }),
    );
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("rate-limited");
    expect(outcome.retryAfterMs).toBe(90_000);
  });

  it("returns remote-error on HTTP 503", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("oops", { status: 503 }));
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("remote-error");
  });

  it("returns network on fetch rejection", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("network");
  });

  it("returns timeout on AbortError", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    });
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 1,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errorKind).toBe("timeout");
  });

  it("treats short / maintenance HTML as zero-records (no parse-error)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        makeHtmlResponse(200, "<html>Service unavailable</html>"),
      );
    const outcome = await unoosaAdapter.detect({
      organizationId: ORG_ID,
      legalName: "Acme",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    // Maintenance pages are surfaced as zero-records, not parse-error
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.fields).toEqual([]);
  });
});

// ─── helpers ───────────────────────────────────────────────────────────────

function padPage(html: string): string {
  // The parser short-circuits on HTML < 500 chars to avoid noisy ones.
  // Pad to ensure parse logic actually runs.
  return `<!DOCTYPE html><html><head><title>UNOOSA</title></head><body>${html}</body></html>`.padEnd(
    1200,
    " ",
  );
}

function makeHtmlResponse(status: number, html: string): Response {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
