import { siteConfig } from "@/lib/seo";

// Blog posts data - in production, this would come from a CMS or database
const blogPosts = [
  {
    slug: "eu-space-act-explained",
    title: "What is the EU Space Act? Everything You Need to Know",
    description:
      "A comprehensive guide to the EU Space Act, covering authorization requirements, compliance timelines, and what it means for space operators.",
    publishedAt: "2025-01-15T10:00:00Z",
    category: "EU Space Act",
  },
  {
    slug: "nis2-space-operators",
    title: "How NIS2 Affects Space Operators",
    description:
      "Understanding NIS2 cybersecurity requirements for space operators, including essential entity classification and compliance obligations.",
    publishedAt: "2025-01-14T10:00:00Z",
    category: "NIS2",
  },
  {
    slug: "space-debris-iadc-vs-iso",
    title: "IADC Guidelines vs ISO 24113: Space Debris Standards Compared",
    description:
      "A detailed comparison of IADC Space Debris Mitigation Guidelines and ISO 24113 for satellite operators.",
    publishedAt: "2025-01-13T10:00:00Z",
    category: "Debris Mitigation",
  },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateRssFeed(): string {
  const baseUrl = siteConfig.url;

  const items = blogPosts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <author>${siteConfig.email} (${siteConfig.name})</author>
    </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.name)} - Space Compliance Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Expert insights on EU Space Act, NIS2, space debris, export control, and satellite licensing. Stay ahead of space regulation changes.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${baseUrl}</link>
    </image>
    <copyright>Copyright ${new Date().getFullYear()} ${siteConfig.name}</copyright>
    <managingEditor>${siteConfig.email} (${siteConfig.name})</managingEditor>
    <webMaster>${siteConfig.email} (${siteConfig.name})</webMaster>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>`;
}

export async function GET() {
  const feed = generateRssFeed();

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
