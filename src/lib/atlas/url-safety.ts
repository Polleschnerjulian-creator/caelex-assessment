import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared SSRF-safe URL helpers for the Atlas crons that fetch external
 * URLs (atlas-source-check, atlas-feed-discovery). Centralises the
 * public-target check (previously duplicated, IPv4-only, per cron) and
 * adds manual redirect-following with per-hop revalidation — a public
 * URL must not be able to 30x-redirect into a private/metadata target
 * (H4).
 *
 * NOTE: web-tools.server.ts has a parallel implementation for the
 * lawyer-facing fetch_url tool; it could later be folded into this
 * module. Kept separate for now to avoid touching that deployed path.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * True when `raw` is a syntactically valid http(s) URL whose host is a
 * public-internet target (not loopback, RFC1918, link-local, cloud-
 * metadata, or their IPv6 equivalents). Node's WHATWG URL parser
 * normalises numeric IPv4 encodings (decimal/hex/octal) to dotted form,
 * so the dotted checks below also cover `http://2130706433/` etc.
 *
 * NOT exhaustive against DNS rebinding (a hostname resolving to a
 * private IP) — that requires network-level egress filtering.
 */
export function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();

  // IPv6 literals arrive bracketed from URL.hostname (e.g. "[::1]").
  if (host.startsWith("[")) {
    const v6 = host.slice(1, -1).replace(/%.*$/, "");
    if (
      v6 === "::1" ||
      v6 === "::" ||
      v6.startsWith("::ffff:") ||
      /^fe80/i.test(v6) ||
      /^f[cd]/i.test(v6)
    ) {
      return false;
    }
    return true;
  }

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }
  return true;
}

/**
 * Fetch `url` following redirects MANUALLY (up to `maxRedirects` hops),
 * revalidating every hop with isPublicHttpUrl so a public URL can't
 * bounce into a private target. Returns the final non-redirect Response
 * on success, or a structured failure with a reason the caller can log.
 *
 * The caller owns body reading + status handling on the returned
 * Response (keeps the cron's bounded-body + status logic intact).
 */
export async function fetchFollowingRedirects(
  url: string,
  init: RequestInit,
  opts: { maxRedirects?: number } = {},
): Promise<{ ok: true; response: Response } | { ok: false; reason: string }> {
  const maxRedirects = opts.maxRedirects ?? 5;
  let currentUrl = url;
  for (let hop = 0; ; hop++) {
    if (!isPublicHttpUrl(currentUrl)) {
      return {
        ok: false,
        reason: hop === 0 ? "unsafe-url" : "unsafe-redirect",
      };
    }
    if (hop > maxRedirects) {
      return { ok: false, reason: "too-many-redirects" };
    }
    const response = await fetch(currentUrl, { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, reason: "redirect-without-location" };
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return { ok: true, response };
  }
}
