/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the shared SSRF-safe URL helpers used by the Atlas crons
 * (atlas-source-check, atlas-feed-discovery). Covers the redirect-
 * revalidation gap (H4): a public URL that 30x-redirects to a private
 * target must NOT be followed.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { isPublicHttpUrl, fetchFollowingRedirects } from "./url-safety";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe("isPublicHttpUrl", () => {
  it("allows a normal public https URL", () => {
    expect(isPublicHttpUrl("https://eur-lex.europa.eu/x")).toBe(true);
  });

  it("blocks localhost / RFC1918 / link-local / metadata (IPv4)", () => {
    for (const u of [
      "http://localhost/",
      "http://127.0.0.1/",
      "http://10.0.0.1/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://169.254.169.254/latest/meta-data/",
    ]) {
      expect(isPublicHttpUrl(u)).toBe(false);
    }
  });

  it("blocks IPv6 loopback / ULA / IPv4-mapped", () => {
    for (const u of [
      "http://[::1]/",
      "http://[fd00::1]/",
      "http://[::ffff:169.254.169.254]/",
    ]) {
      expect(isPublicHttpUrl(u)).toBe(false);
    }
  });

  it("blocks unsupported protocols and garbage", () => {
    expect(isPublicHttpUrl("ftp://example.com/x")).toBe(false);
    expect(isPublicHttpUrl("not-a-url")).toBe(false);
  });
});

describe("fetchFollowingRedirects", () => {
  it("refuses a redirect that resolves to a private target", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
    ) as typeof fetch;
    const r = await fetchFollowingRedirects(
      "https://innocent.example.com/x",
      {},
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/redirect/i);
  });

  it("follows a redirect to another public target", async () => {
    let n = 0;
    global.fetch = vi.fn(async () => {
      n++;
      return n === 1
        ? new Response(null, {
            status: 302,
            headers: { location: "https://public.example.org/y" },
          })
        : new Response("hi", { status: 200 });
    }) as typeof fetch;
    const r = await fetchFollowingRedirects(
      "https://innocent.example.com/x",
      {},
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.response.status).toBe(200);
  });

  it("rejects an initial unsafe URL before fetching", async () => {
    const spy = vi.fn();
    global.fetch = spy as unknown as typeof fetch;
    const r = await fetchFollowingRedirects("http://127.0.0.1/", {});
    expect(r.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
