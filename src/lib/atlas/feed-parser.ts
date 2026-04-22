import "server-only";

/**
 * Minimal RSS-2.0 + Atom-1.0 parser — used by the atlas-feed-discovery
 * cron to scan public gazette / UN / EU feeds for space-law entries.
 *
 * No new dependencies: the feeds Caelex consumes (gesetze-im-internet.de,
 * UNOOSA, etc.) are well-formed enough that regex-based extraction is
 * reliable, and adding a full XML parser just for this is overkill.
 *
 * If a feed turns out to be malformed, parseFeed returns an empty list
 * rather than throwing — the cron should never fail due to one bad feed.
 */

export interface FeedItem {
  title: string;
  url: string;
  description?: string;
  publishedAt?: Date;
  /** Raw identifier when present (RSS guid / Atom id) — used to dedupe
   *  across runs when the URL changes but the logical entry is the same. */
  guid?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripCdata(s: string): string {
  const trimmed = s.trim();
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(trimmed);
  return m ? m[1].trim() : trimmed;
}

function extractTag(block: string, tag: string): string | undefined {
  // Non-greedy match of the first <tag>…</tag>. Allows attributes on
  // the opening tag (e.g. <title type="text">).
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return undefined;
  return decodeEntities(stripCdata(m[1]));
}

function extractAtomLink(block: string): string | undefined {
  // Atom feeds express links as <link href="…" rel="alternate"/>. Prefer
  // rel="alternate" or links without a rel attribute; skip rel="self".
  const candidates: { href: string; rel?: string }[] = [];
  const re = /<link\b([^/>]*?)\/?>|<link\b([^>]*)>\s*<\/link>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const attrs = m[1] ?? m[2] ?? "";
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!href) continue;
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    candidates.push({ href, rel });
  }
  const preferred =
    candidates.find((c) => !c.rel || c.rel === "alternate") ?? candidates[0];
  return preferred?.href;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

export function parseFeed(xml: string): FeedItem[] {
  if (!xml) return [];

  const items: FeedItem[] = [];

  // RSS 2.0 — iterate <item>…</item> blocks
  const rssRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = rssRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const url =
      extractTag(block, "link") ??
      // Some feeds use <guid isPermaLink="true">url</guid>
      (() => {
        const g = extractTag(block, "guid");
        return g && /^https?:\/\//.test(g) ? g : undefined;
      })();
    if (!title || !url) continue;
    items.push({
      title: title.trim(),
      url: url.trim(),
      description: extractTag(block, "description")?.trim(),
      publishedAt:
        parseDate(extractTag(block, "pubDate")) ??
        parseDate(extractTag(block, "dc:date")),
      guid: extractTag(block, "guid")?.trim(),
    });
  }
  if (items.length > 0) return items;

  // Atom 1.0 — iterate <entry>…</entry>
  const atomRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((m = atomRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const url = extractAtomLink(block);
    if (!title || !url) continue;
    items.push({
      title: title.trim(),
      url: url.trim(),
      description:
        extractTag(block, "summary")?.trim() ??
        extractTag(block, "content")?.trim(),
      publishedAt:
        parseDate(extractTag(block, "updated")) ??
        parseDate(extractTag(block, "published")),
      guid: extractTag(block, "id")?.trim(),
    });
  }

  return items;
}

/**
 * Normalise a URL for dedupe-key purposes: lowercase host, drop fragment,
 * drop trailing slash, drop common tracking params. Good enough that two
 * polls of the same feed produce matching keys.
 */
export function normaliseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const cleanParams = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (/^utm_|^ref$|^fbclid$|^gclid$/i.test(k)) continue;
      cleanParams.append(k, v);
    }
    const qs = cleanParams.toString();
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}${qs ? "?" + qs : ""}`;
  } catch {
    return raw.trim();
  }
}
