/**
 * CSP Nonce Utilities
 *
 * Generates cryptographically secure nonces for Content Security Policy.
 * Used to allow specific inline scripts while blocking others.
 */

import { headers } from "next/headers";

// Header name for passing nonce to components
export const CSP_NONCE_HEADER = "x-csp-nonce";

/**
 * Generate a cryptographically secure nonce for CSP.
 * Uses Web Crypto API (available in Edge Runtime).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

/**
 * Get the CSP nonce from request headers.
 * Use this in Server Components to get the nonce for inline scripts.
 *
 * @example
 * ```tsx
 * import { getNonce } from '@/lib/csp-nonce';
 *
 * export default async function Page() {
 *   const nonce = await getNonce();
 *   return <script nonce={nonce}>console.log('secure')</script>;
 * }
 * ```
 */
export async function getNonce(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get(CSP_NONCE_HEADER) ?? undefined;
}

// Known script hashes (SHA-256) for static inline scripts
// These allow specific inline scripts without using 'unsafe-inline'
export const SCRIPT_HASHES = {
  // Theme detection script in layout.tsx - prevents flash of wrong theme
  themeScript: "sha256-Q7N2DIgezpSR4tLfwoaJNEGsOuaNbPwdtz0uFDN5Gok=",
} as const;

/**
 * Build CSP header value.
 *
 * Note: Next.js framework scripts don't support nonces yet (as of Next.js 15).
 * We use 'unsafe-inline' for scripts but still get significant protection:
 * - Blocks external script injection (main XSS vector)
 * - Restricts connections to trusted domains
 * - Prevents clickjacking via frame-ancestors
 * - Blocks object/embed elements
 *
 * When Next.js adds native CSP nonce support, switch to nonce-based approach.
 * See: https://github.com/vercel/next.js/discussions/54152
 */
export function buildCspHeader(nonce: string, isDev = false): string {
  const scriptSrcParts = [
    "'self'",
    // Unfortunately needed for Next.js framework scripts
    "'unsafe-inline'",
    // External trusted sources only
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://*.sentry.io",
    "https://va.vercel-scripts.com",
    "blob:", // For @react-pdf/renderer workers
  ];

  // Only allow eval in development for hot reload
  if (isDev) {
    scriptSrcParts.push("'unsafe-eval'");
  }

  const directives = [
    // Default: only allow same origin
    "default-src 'self'",
    // Scripts: self + unsafe-inline (Next.js requirement) + trusted external sources
    `script-src ${scriptSrcParts.join(" ")}`,
    // Styles: self, inline (needed for CSS-in-JS like Tailwind), Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts: self, Google Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
    // Images: self, data URIs, HTTPS, blob (for file previews)
    "img-src 'self' data: https: blob:",
    // Connections: explicitly whitelisted domains only
    "connect-src 'self' blob: https://accounts.google.com https://*.neon.tech wss://*.neon.tech https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io https://api.stripe.com https://vitals.vercel-insights.com",
    // Frames: Google OAuth popup, Stripe
    "frame-src 'self' https://accounts.google.com https://js.stripe.com https://hooks.stripe.com",
    // Form submissions: only to self
    "form-action 'self'",
    // Base URI: only self (prevents base tag hijacking)
    "base-uri 'self'",
    // Prevent embedding in frames (clickjacking protection)
    "frame-ancestors 'none'",
    // Upgrade HTTP to HTTPS
    "upgrade-insecure-requests",
    // Block all object/embed (Flash, Java applets)
    "object-src 'none'",
    // Worker scripts
    "worker-src 'self' blob:",
    // Manifest
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

/**
 * Build a strict CSP header for API routes.
 * API routes don't need scripts, so we can be very restrictive.
 */
export function buildApiCspHeader(): string {
  return "default-src 'none'; frame-ancestors 'none'";
}
