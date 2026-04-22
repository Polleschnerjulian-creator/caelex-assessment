import { MetadataRoute } from "next";

/**
 * robots.ts — crawler policy for caelex.eu
 *
 * Strategic posture (2026-04-22): ALLOW major LLM + search crawlers
 * on all public content. The prior version explicitly blocked
 * GPTBot, ClaudeBot, anthropic-ai, Google-Extended, CCBot, and
 * every other AI crawler — which also excluded Caelex from ChatGPT
 * live retrieval (ChatGPT-User / OAI-SearchBot), from Claude's
 * browsing (ClaudeBot), and from Common Crawl-derived training
 * datasets that feed most foundation models.
 *
 * The trade-off:
 *   pro: Caelex content becomes discoverable when users ask LLMs
 *        "is there a platform for EU Space Act compliance?" —
 *        both in training data (CCBot, GPTBot, anthropic-ai,
 *        Google-Extended) and in live retrieval (ChatGPT-User,
 *        OAI-SearchBot, ClaudeBot, PerplexityBot).
 *   con: Public marketing / resource content may be referenced
 *        or paraphrased by LLMs. The regulatory-content pages
 *        (EU Space Act overview, jurisdictions, glossary, blog,
 *        resources) are INTENDED to be widely cited — that is
 *        the discovery strategy.
 *
 * What stays blocked: the authenticated product surface and the
 * Next.js build artifacts. User data, tokens, and operator-specific
 * content are never reachable by any crawler anyway — these are
 * hard-blocked belt-and-braces.
 *
 * Companion LLM-facing files (surfaced via /public/):
 *   /llms.txt       — concise LLM-facing index (llmstxt.org spec)
 *   /llms-full.txt  — long-form LLM-facing content
 *   /sitemap.xml    — canonical URL inventory
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.caelex.eu";

  // Authenticated product surface + build artifacts. Every rule
  // below inherits this disallow list — so no matter which crawler
  // reads robots.txt, private content stays blocked by policy (in
  // addition to being hard-blocked by auth middleware).
  const privatePaths = [
    "/api/",
    "/dashboard/",
    "/app/",
    "/admin/",
    "/auth/",
    "/login",
    "/signup",
    "/atlas",
    "/atlas/",
    "/atlas-login",
    "/atlas-signup",
    "/atlas-forgot-password",
    "/atlas-reset-password",
    "/atlas-access",
    "/atlas-invite/",
    "/atlas-no-access",
    "/accept-invite",
    "/settings/",
    "/stakeholder/",
    "/supplier/",
    "/_next/",
    "/static/",
  ];

  // Explicit allowlist of AI crawlers. Named individually so the
  // set of welcomed bots is auditable, and so a future targeted
  // block (e.g. against an abusive crawler) is a one-line change.
  // Each bot gets the same default: allow the public site, deny
  // the private surface.
  const aiCrawlers = [
    // OpenAI — training + live retrieval for ChatGPT
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    // Anthropic — Claude training + live retrieval
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    // Google — Gemini training + AI Overviews
    "Google-Extended",
    // Common Crawl — upstream for most open-weight model training
    "CCBot",
    // Perplexity — retrieval-first search assistant
    "PerplexityBot",
    "Perplexity-User",
    // Apple — Apple Intelligence training
    "Applebot-Extended",
    // Meta — Meta AI / Llama
    "Meta-ExternalAgent",
    "Meta-ExternalFetcher",
    // Mistral — French AI ecosystem (relevant for EU space operators)
    "MistralAI-User",
    // You.com
    "YouBot",
    // Cohere
    "cohere-ai",
    // DuckDuckGo — privacy-first retrieval (also powers DuckAssist)
    "DuckAssistBot",
  ];

  return {
    rules: [
      // Catch-all: every crawler not explicitly named below gets
      // the same default — public content allowed, private blocked.
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      // Explicitly welcome every AI crawler with the same policy
      // as humans. Identical to the catch-all rule today, but kept
      // as separate blocks so the allowlist is auditable and any
      // future per-bot tweak is surgical.
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privatePaths,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
