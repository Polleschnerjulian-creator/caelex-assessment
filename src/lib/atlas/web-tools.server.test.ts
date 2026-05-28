import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Web-Tools bundle smoke-tests (Atlas V3 T1.D).
 *
 * Global `fetch` is mocked so no real network traffic — zero
 * external-cost compliant per master-plan § 2 C-1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  WEB_TOOLS,
  isWebToolName,
  executeWebTool,
  isPublicHttpUrl,
} from "./web-tools.server";

const originalFetch = global.fetch;

function mockFetch(payload: { ok: boolean; status?: number; body: string }) {
  global.fetch = vi.fn(async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload.body));
        controller.close();
      },
    });
    return new Response(stream, {
      status: payload.status ?? (payload.ok ? 200 : 500),
      statusText: payload.ok ? "OK" : "Error",
    });
  }) as typeof fetch;
}

describe("web-tools bundle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("WEB_TOOLS schema", () => {
    it("exports exactly 4 tools", () => {
      expect(WEB_TOOLS).toHaveLength(4);
      const names = WEB_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "fetch_url",
        "search_courtlistener",
        "search_eurlex",
        "web_search",
      ]);
    });

    it("web_search + fetch_url + search_eurlex + search_courtlistener all require their primary param", () => {
      const webSearch = WEB_TOOLS.find((t) => t.name === "web_search");
      const fetchUrl = WEB_TOOLS.find((t) => t.name === "fetch_url");
      const eurlex = WEB_TOOLS.find((t) => t.name === "search_eurlex");
      const cl = WEB_TOOLS.find((t) => t.name === "search_courtlistener");

      expect(
        (webSearch?.input_schema as { required?: string[] }).required,
      ).toEqual(["query"]);
      expect(
        (fetchUrl?.input_schema as { required?: string[] }).required,
      ).toEqual(["url"]);
      expect(
        (eurlex?.input_schema as { required?: string[] }).required,
      ).toEqual(["query"]);
      expect((cl?.input_schema as { required?: string[] }).required).toEqual([
        "query",
      ]);
    });
  });

  describe("isWebToolName", () => {
    it("returns true for all 4 web tool names", () => {
      expect(isWebToolName("web_search")).toBe(true);
      expect(isWebToolName("fetch_url")).toBe(true);
      expect(isWebToolName("search_eurlex")).toBe(true);
      expect(isWebToolName("search_courtlistener")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isWebToolName("search_legal_sources")).toBe(false);
      expect(isWebToolName("search_cases")).toBe(false);
      expect(isWebToolName("")).toBe(false);
    });
  });

  describe("executeWebTool — web_search", () => {
    it("rejects too-short query", async () => {
      const result = await executeWebTool({
        name: "web_search",
        input: { query: "ab" },
      });
      expect(result.isError).toBe(true);
    });

    it("parses DuckDuckGo instant-answer correctly", async () => {
      mockFetch({
        ok: true,
        body: JSON.stringify({
          Heading: "NIS2 Directive",
          AbstractText: "EU directive on cybersecurity...",
          AbstractURL: "https://en.wikipedia.org/wiki/NIS2_Directive",
          AbstractSource: "Wikipedia",
          RelatedTopics: [],
          Results: [],
        }),
      });
      const result = await executeWebTool({
        name: "web_search",
        input: { query: "NIS2 directive" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.hit_count).toBeGreaterThan(0);
      expect(payload.hits[0].source).toBe("instant_answer");
    });

    it("returns hint when no matches", async () => {
      mockFetch({
        ok: true,
        body: JSON.stringify({
          Heading: "",
          AbstractText: "",
          RelatedTopics: [],
          Results: [],
        }),
      });
      const result = await executeWebTool({
        name: "web_search",
        input: { query: "extremely-rare-token-zzz" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.hit_count).toBe(0);
      expect(payload.hint).toContain("no instant-answer");
    });

    it("handles DuckDuckGo non-JSON response gracefully", async () => {
      mockFetch({ ok: true, body: "<html>not json</html>" });
      const result = await executeWebTool({
        name: "web_search",
        input: { query: "test query" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("non-JSON");
    });
  });

  describe("executeWebTool — fetch_url", () => {
    it("blocks localhost target", async () => {
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "http://localhost:3000/admin" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("URL_BLOCKED");
    });

    it("blocks 127.0.0.1 target", async () => {
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "http://127.0.0.1/x" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("URL_BLOCKED");
    });

    it("blocks RFC1918 private targets", async () => {
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "http://10.0.0.1/x" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("URL_BLOCKED");
    });

    it("rejects invalid URL", async () => {
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "not-a-url" },
      });
      expect(result.isError).toBe(true);
    });

    it("rejects unsupported protocols (ftp)", async () => {
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "ftp://example.com/file" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("URL_BLOCKED");
    });

    it("strips HTML and returns text body", async () => {
      mockFetch({
        ok: true,
        body: `<html><head><title>Test</title><script>bad()</script></head><body><main><h1>Hello</h1><p>This is &amp; some content</p></main></body></html>`,
      });
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "https://example.com/article" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.url).toContain("example.com");
      expect(payload.text).toContain("Hello");
      expect(payload.text).toContain("This is & some content");
      expect(payload.text).not.toContain("<h1>");
      expect(payload.text).not.toContain("bad()");
    });

    it("returns isError when upstream fails", async () => {
      global.fetch = vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch;
      const result = await executeWebTool({
        name: "fetch_url",
        input: { url: "https://example.com/" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).detail).toContain("ECONNREFUSED");
    });
  });

  describe("executeWebTool — search_eurlex", () => {
    it("parses CELEX numbers from HTML response", async () => {
      const html = `
        <html><body>
          <a class="title" href="/legal-content/EN/TXT/?uri=CELEX:32022L2555">NIS2 Directive</a>
          <a class="title" href="/legal-content/EN/TXT/?uri=CELEX:32024R1689">AI Act</a>
        </body></html>
      `;
      mockFetch({ ok: true, body: html });
      const result = await executeWebTool({
        name: "search_eurlex",
        input: { query: "cybersecurity", limit: 5 },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.result_count).toBeGreaterThan(0);
      expect(payload.results[0].celex).toMatch(/^\d{5}[A-Z]\d+$/);
    });

    it("returns empty results gracefully", async () => {
      mockFetch({ ok: true, body: "<html>no celex here</html>" });
      const result = await executeWebTool({
        name: "search_eurlex",
        input: { query: "some query" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.result_count).toBe(0);
      expect(payload.hint).toContain("no matches");
    });

    it("returns fallback URL when EUR-Lex unreachable", async () => {
      global.fetch = vi.fn(async () => {
        throw new Error("timeout");
      }) as typeof fetch;
      const result = await executeWebTool({
        name: "search_eurlex",
        input: { query: "test" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).fallback_url).toContain(
        "eur-lex.europa.eu",
      );
    });
  });

  describe("executeWebTool — search_courtlistener", () => {
    it("parses CourtListener JSON results", async () => {
      mockFetch({
        ok: true,
        body: JSON.stringify({
          results: [
            {
              caseName: "Cosmos 954 Settlement",
              court: "ICAO Liability Commission",
              dateFiled: "1981-04-02",
              snippet:
                "First successful application of the Liability Convention...",
              absolute_url: "/opinion/12345/cosmos-954/",
              citation: ["INT-Liability-Award-1981"],
            },
          ],
        }),
      });
      const result = await executeWebTool({
        name: "search_courtlistener",
        input: { query: "cosmos 954" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.result_count).toBe(1);
      expect(payload.results[0].case_name).toBe("Cosmos 954 Settlement");
      expect(payload.results[0].url).toContain("https://www.courtlistener.com");
    });

    it("handles empty results", async () => {
      mockFetch({ ok: true, body: JSON.stringify({ results: [] }) });
      const result = await executeWebTool({
        name: "search_courtlistener",
        input: { query: "very-rare-case-name-xyz" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.result_count).toBe(0);
      expect(payload.hint).toContain("no matches");
    });
  });

  describe("executeWebTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeWebTool({
        name: "bogus_tool" as never,
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown web");
    });
  });
});

describe("isPublicHttpUrl — SSRF hardening (S2)", () => {
  it("allows a normal public https URL", () => {
    expect(isPublicHttpUrl("https://eur-lex.europa.eu/x").ok).toBe(true);
  });

  it("blocks IPv6 loopback [::1]", () => {
    expect(isPublicHttpUrl("http://[::1]:8080/").ok).toBe(false);
  });

  it("blocks IPv4-mapped IPv6 pointing at cloud metadata", () => {
    expect(
      isPublicHttpUrl("http://[::ffff:169.254.169.254]/latest/meta-data/").ok,
    ).toBe(false);
  });

  it("blocks IPv6 ULA (fd00::/8)", () => {
    expect(isPublicHttpUrl("http://[fd00::1]/").ok).toBe(false);
  });

  it("blocks decimal-encoded loopback (2130706433 = 127.0.0.1)", () => {
    expect(isPublicHttpUrl("http://2130706433/").ok).toBe(false);
  });

  it("blocks hex-encoded loopback (0x7f000001 = 127.0.0.1)", () => {
    expect(isPublicHttpUrl("http://0x7f000001/").ok).toBe(false);
  });

  it("still blocks plain dotted private/loopback ranges", () => {
    expect(isPublicHttpUrl("http://169.254.169.254/").ok).toBe(false);
    expect(isPublicHttpUrl("http://10.1.2.3/").ok).toBe(false);
  });
});

describe("fetch_url — SSRF via redirect (S1)", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("refuses a redirect that resolves to a private target", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
    ) as typeof fetch;
    const result = await executeWebTool({
      name: "fetch_url",
      input: { url: "https://innocent.example.com/redir" },
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content).detail).toMatch(/block/i);
  });

  it("follows a redirect to another public target", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://public.example.org/article" },
        });
      }
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode("<main><p>Hello redirect</p></main>"),
          );
          controller.close();
        },
      });
      return new Response(stream, { status: 200, statusText: "OK" });
    }) as typeof fetch;
    const result = await executeWebTool({
      name: "fetch_url",
      input: { url: "https://innocent.example.com/redir" },
    });
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content).text).toContain("Hello redirect");
  });
});
