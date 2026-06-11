/**
 * Upstash Redis REST credential resolution — single source of truth.
 *
 * The Vercel Marketplace "Upstash for Redis" integration injects the REST
 * credentials under KV_* names (legacy Vercel-KV naming; same Upstash REST
 * protocol) in some setups and under UPSTASH_* names in others. Every
 * consumer (rate limiting, middleware, MFA challenge store, server cache)
 * resolves through this helper so the integration is plug-and-play no
 * matter which names it injects.
 *
 * Deliberately NO "server-only" import — src/middleware.ts (edge runtime)
 * uses this too, and reading process.env is edge-safe.
 */
export function getUpstashCredentials(): {
  url: string;
  token: string;
} | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}
