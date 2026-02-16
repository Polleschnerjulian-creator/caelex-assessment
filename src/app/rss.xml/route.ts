import { siteConfig } from "@/lib/seo";
import { getAllPosts } from "@/content/blog/posts";

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
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <author>${siteConfig.email} (${post.author})</author>
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
