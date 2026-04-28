// tests/unit/lib/atlas/feed-parser.test.ts

/**
 * Unit tests for src/lib/atlas/feed-parser.ts — the regex-based RSS-2.0
 * + Atom-1.0 parser used by the atlas-feed-discovery cron to scan
 * gazette / UN / EU feeds for new space-law entries.
 *
 * Coverage focus:
 *   - parseFeed handles RSS 2.0 (single-namespace) cleanly
 *   - parseFeed handles Atom 1.0 with <entry> + <link href="…" />
 *   - Malformed feeds return [] rather than throwing
 *   - HTML entities + CDATA blocks are decoded
 *   - normaliseUrl strips fragments + tracking params for dedupe
 *
 * NOTE: server-only directive at the top of feed-parser.ts is fine in
 * a vitest environment — vitest doesn't enforce the boundary.
 */

import { describe, it, expect } from "vitest";
import { parseFeed, normaliseUrl } from "@/lib/atlas/feed-parser";

describe("parseFeed — empty / malformed input", () => {
  it("returns [] for empty string", () => {
    expect(parseFeed("")).toEqual([]);
  });

  it("returns [] for non-XML text", () => {
    expect(parseFeed("Hello, world!")).toEqual([]);
  });

  it("returns [] for XML without item/entry tags", () => {
    const xml = `<?xml version="1.0"?><rss><channel><title>Empty feed</title></channel></rss>`;
    expect(parseFeed(xml)).toEqual([]);
  });

  it("does not throw on truncated XML", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Truncated`;
    expect(() => parseFeed(xml)).not.toThrow();
  });
});

describe("parseFeed — RSS 2.0", () => {
  it("extracts title + url + description + pubDate from <item>", () => {
    const xml = `
<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Feed</title>
    <item>
      <title>Verordnung X</title>
      <link>https://example.com/a</link>
      <description>Beschreibung</description>
      <pubDate>Mon, 28 Apr 2026 10:00:00 GMT</pubDate>
      <guid>guid-1</guid>
    </item>
  </channel>
</rss>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Verordnung X");
    expect(items[0].url).toBe("https://example.com/a");
    expect(items[0].description).toBe("Beschreibung");
    expect(items[0].guid).toBe("guid-1");
    expect(items[0].publishedAt).toBeInstanceOf(Date);
  });

  it("decodes HTML entities and CDATA blocks", () => {
    const xml = `
<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Cat & Dog]]></title>
      <link>https://example.com/b</link>
      <description>Q&amp;A about &lt;tag&gt;</description>
    </item>
  </channel>
</rss>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Cat & Dog");
    expect(items[0].description).toBe("Q&A about <tag>");
  });

  it("falls back to <guid isPermaLink='true'> when <link> is missing", () => {
    const xml = `
<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Per GUID</title>
      <guid>https://example.com/permalink</guid>
    </item>
  </channel>
</rss>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].url).toBe("https://example.com/permalink");
  });

  it("skips items missing title or url", () => {
    const xml = `
<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <link>https://example.com/no-title</link>
    </item>
    <item>
      <title>Has title but no url</title>
    </item>
    <item>
      <title>Complete</title>
      <link>https://example.com/c</link>
    </item>
  </channel>
</rss>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Complete");
  });

  it("returns multiple items in feed order", () => {
    const xml = `
<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>First</title><link>https://example.com/1</link></item>
    <item><title>Second</title><link>https://example.com/2</link></item>
    <item><title>Third</title><link>https://example.com/3</link></item>
  </channel>
</rss>`;
    const items = parseFeed(xml);
    expect(items.map((i) => i.title)).toEqual(["First", "Second", "Third"]);
  });
});

describe("parseFeed — Atom 1.0", () => {
  it("extracts title + url + summary + updated from <entry>", () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sample Feed</title>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/atom-1" rel="alternate"/>
    <summary>Summary here</summary>
    <id>tag:example.com,2026:1</id>
    <updated>2026-04-28T10:00:00Z</updated>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Atom Entry One");
    expect(items[0].url).toBe("https://example.com/atom-1");
    expect(items[0].description).toBe("Summary here");
    expect(items[0].guid).toBe("tag:example.com,2026:1");
    expect(items[0].publishedAt).toBeInstanceOf(Date);
  });

  it("prefers rel='alternate' over rel='self' when both are present", () => {
    const xml = `
<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Has both rels</title>
    <link href="https://example.com/self" rel="self"/>
    <link href="https://example.com/alt" rel="alternate"/>
    <id>x</id>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].url).toBe("https://example.com/alt");
  });

  it("falls back to <content> when <summary> is missing", () => {
    const xml = `
<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Content fallback</title>
    <link href="https://example.com/c" rel="alternate"/>
    <content>Body content</content>
    <id>y</id>
  </entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].description).toBe("Body content");
  });

  it("RSS items take precedence over Atom entries when both are present", () => {
    // Mixed feed shouldn't realistically occur, but the parser tries
    // RSS first and only falls through to Atom if RSS yielded nothing.
    const xml = `
<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>RSS Wins</title><link>https://r.example.com</link></item>
  </channel>
</rss>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>Atom Loses</title><link href="https://a.example.com" rel="alternate"/><id>x</id></entry>
</feed>`;
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("RSS Wins");
  });
});

describe("normaliseUrl", () => {
  it("returns input on parse failure (not a valid URL)", () => {
    expect(normaliseUrl("not a url")).toBe("not a url");
  });

  it("lowercases the host", () => {
    expect(normaliseUrl("https://EXAMPLE.com/path")).toBe(
      "https://example.com/path",
    );
  });

  it("drops the fragment", () => {
    expect(normaliseUrl("https://example.com/path#anchor")).toBe(
      "https://example.com/path",
    );
  });

  it("drops trailing slash on the path", () => {
    expect(normaliseUrl("https://example.com/path/")).toBe(
      "https://example.com/path",
    );
  });

  it("strips utm_ tracking parameters", () => {
    expect(
      normaliseUrl(
        "https://example.com/x?utm_source=tw&utm_medium=cpc&utm_campaign=x",
      ),
    ).toBe("https://example.com/x");
  });

  it("strips ref / fbclid / gclid tracking parameters", () => {
    expect(normaliseUrl("https://example.com/x?ref=foo")).toBe(
      "https://example.com/x",
    );
    expect(normaliseUrl("https://example.com/x?fbclid=ABC")).toBe(
      "https://example.com/x",
    );
    expect(normaliseUrl("https://example.com/x?gclid=ABC")).toBe(
      "https://example.com/x",
    );
  });

  it("preserves substantive query parameters (id, q, page, etc.)", () => {
    expect(normaliseUrl("https://example.com/search?q=law&page=2")).toBe(
      "https://example.com/search?q=law&page=2",
    );
  });

  it("strips tracking but keeps content params in the same URL", () => {
    expect(
      normaliseUrl("https://example.com/p?utm_source=x&id=42&utm_medium=cpc"),
    ).toBe("https://example.com/p?id=42");
  });

  it("two URLs differing only by tracking params normalise to the same key (dedupe)", () => {
    const a = normaliseUrl("https://example.com/x?utm_source=email#top");
    const b = normaliseUrl("https://example.com/x?utm_source=feed");
    expect(a).toBe(b);
  });
});
