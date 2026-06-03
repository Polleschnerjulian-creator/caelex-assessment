/** @type {import('next').NextConfig} */
const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");

/**
 * Security Headers Configuration
 *
 * Implements OWASP recommended security headers for:
 * - XSS Protection
 * - Clickjacking Prevention
 * - MIME Type Sniffing Prevention
 * - HSTS (HTTP Strict Transport Security)
 * - Content Security Policy
 * - Permissions Policy
 */
const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Enable browser XSS filter
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // DNS prefetch control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // HTTP Strict Transport Security (1 year + preload).
  // Production-only: in dev the Next server speaks plain HTTP and HSTS
  // would HTTPS-pin localhost in the browser, breaking subsequent
  // hot-reloads (and the Tauri desktop dev mode). Stripped via a spread
  // below.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Permissions Policy - disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()", // Disable FLoC
      "accelerometer=()",
      "gyroscope=()",
      "magnetometer=()",
      "usb=()",
      "payment=()",
    ].join(", "),
  },
  // NOTE: Content-Security-Policy is now set dynamically in middleware.ts
  // with nonce-based script protection. See src/lib/csp-nonce.ts for config.
  //
  // X-Robots-Tag — tells LLM + search crawlers they may use the FULL
  // content of a page in their AI answer boxes and training snippets.
  // Without this, Google AI Overview / Bing Copilot / retrieval-aware
  // LLMs default to shorter snippets that rarely capture the full
  // answer we want attributed to Caelex.
  //
  //   index, follow          — allow indexing + link following (default)
  //   max-snippet:-1         — no character cap on snippets; full
  //                            content may be lifted into AI answers
  //   max-image-preview:large — allow full-size images in previews
  //   max-video-preview:-1   — no cap on video previews
  //
  // Private paths (dashboard, api, admin, auth, atlas) are excluded
  // from AI surfacing via the robots.ts disallow list — a crawler
  // that respects robots.txt won't fetch them, so this header only
  // applies in practice to the public marketing + resource surface.
  {
    key: "X-Robots-Tag",
    value:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
];

const nextConfig = {
  // IndexNow ownership-proof rewrite — Bing + Yandex fetch
  // /{INDEXNOW_KEY}.txt and expect the plaintext key as response.
  // Rewriting to /api/indexnow?key=<INDEXNOW_KEY> avoids committing
  // the key to git while still serving the exact file Bing looks
  // for. Guarded by INDEXNOW_KEY being set — otherwise the rewrite
  // just doesn't match anything and /{random}.txt falls through to
  // standard static-file handling (404).
  async rewrites() {
    const key = process.env.INDEXNOW_KEY;
    if (!key) return [];
    return [
      {
        source: `/${key}.txt`,
        destination: `/api/indexnow?key=${key}`,
      },
    ];
  },
  // Apply security headers to all routes
  // NOTE: CSP is handled dynamically in middleware.ts with nonces
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/widget/:path*",
        headers: [
          // Widget CORS: Allow GET only (read-only widget config, no state changes)
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://*.caelex.eu https://caelex.eu https://localhost:*",
          },
        ],
      },
    ];
  },

  // Disable x-powered-by header (information disclosure)
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Per-page SSG timeout. Default in Next.js 15 is 60s; we bump to
  // 180s because some of our marketing + atlas pages with heavy
  // MDX + ImageResponse generation legitimately exceed 60s on the
  // 4-core/8GB Vercel build container. With 60s, slow pages were
  // silently killing the build at "Generating static pages
  // (0/918)..." with no diagnostic line printed before the cancel
  // — a 3-minute budget gives slow pages room to complete while
  // still failing fast on a genuine hang (external fetch with
  // no timeout, deadlocked promise, etc.).
  staticPageGenerationTimeout: 180,

  // H-I3: on CI (github actions) run strict type + lint gates. On the
  // Vercel build container we still skip to avoid 8GB-OOM during the
  // giant production bundle — but github actions ci.yml runs the same
  // `npm run typecheck` + `npm run lint` as separate jobs, so a type
  // error can no longer sneak past via vercel direct-push.
  //
  // Pre-commit hooks (Husky + lint-staged) are the local safety net.
  typescript: {
    ignoreBuildErrors: process.env.CI !== "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.CI !== "true",
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile images
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub avatars
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // Marketing imagery (navigation news)
      },
    ],
  },

  // Prevent Next.js from bundling problematic packages server-side.
  //
  // @react-pdf v3.4.5 embeds react-reconciler v0.23.0 which breaks when
  // Next.js resolves React via the "react-server" condition (missing
  // __SECRET_INTERNALS). Using native Node.js require() resolves React
  // via the "default" condition.
  //
  // @sentry/* + @opentelemetry/instrumentation + @prisma/instrumentation:
  // these use a "dynamic require" pattern that webpack flags as
  // "Critical dependency: the request of a dependency is an expression"
  // and that, in production builds on the 8 GB Vercel container, causes
  // static-page-generation worker processes to deadlock at
  // "Generating static pages (0/845)..." with no progress and no
  // diagnostic. Loading these as native Node modules (not webpack
  // bundles) bypasses the static analysis entirely and unblocks SSG.
  // Recommended fix from Sentry GitHub issue #11067.
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/layout",
    "@react-pdf/pdfkit",
    "@react-pdf/font",
    "@react-pdf/render",
    "@react-pdf/stylesheet",
    "@react-pdf/textkit",
    "@react-pdf/primitives",
    "jsdom",
    "isomorphic-dompurify",
    "@sentry/node",
    "@sentry/nextjs",
    "@opentelemetry/instrumentation",
    "@prisma/instrumentation",
  ],

  // Experimental features
  experimental: {
    // Type-safe server actions
    typedRoutes: false, // Enable when ready
    // Build-memory (Next 15 OOM mitigation): keep webpack's peak heap low
    // during "Creating an optimized production build". The app grew past
    // the 8 GB Vercel container ceiling (Phase 3–5 added ~30 components +
    // routes) and SIGKILL'd at compile. This trades a little build time for
    // a much lower memory peak — pairs with cpus:1 below.
    webpackMemoryOptimizations: true,
    // Limit server action body size to 10MB (prevents abuse)
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Build-memory guard: cap webpack workers so the 8 GB Vercel build
    // container isn't exhausted by parallel threads each consuming
    // ~1 GB on top of the main Node.js heap.
    //
    // History:
    //   - cpus: 4 (default) — peaked >11 GB → SIGKILL at compile
    //   - cpus: 2 — fixed OOM but ~doubled compile time
    //   - cpus: 3 — first try after Sentry externalize, was green WITH
    //     cached build state. But with COLD cache (cache invalidated
    //     by Vercel for being too large), 3 parallel workers each
    //     opening Neon serverless connections at static-gen time
    //     exhausts Neon's connection cap around page 200/847 →
    //     subsequent pages hang.
    //   - cpus: 2 — was current. Math: 4 GB main + 2 × 1 GB workers +
    //     0.5 GB OS = 6.5 GB. Less Neon connection pressure (2
    //     concurrent vs 3). Compile slows by ~30s but static-gen
    //     completes reliably even on cold-cache builds.
    //   - cpus: 1 (current, 2026-05-19) — wave 11A added atlas-
    //     encryption + vault-wrap import chains to 10+ server-routes.
    //     The crypto-chain (scrypt + AES-GCM + per-org-key) is
    //     compile-heavy; per-worker memory peak now exceeds the 1GB
    //     headroom the cpus:2 config assumed. After 7 consecutive
    //     OOM-SIGKILLs at "Creating an optimized production build...",
    //     reduced workers from 2 to 1: single-threaded compile
    //     guarantees no concurrent peak, fits trivially in 8GB
    //     container. Cost: 60-90s slower build, but reliable.
    cpus: 1,
    // NOTE: do NOT add `optimizePackageImports: ['lucide-react']` here.
    // Next.js 15 already optimises lucide-react by default, so it's
    // redundant — and on this memory-constrained build (cpus:1 to avoid
    // OOM-SIGKILL, see above) the extra import-rewriting blew the build
    // time up to ~25min. Removed 2026-06-03 (was a perf-pass misfire).
  },

  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Client-side configuration for @react-pdf/renderer
    if (!isServer) {
      // Force browser builds for @react-pdf packages.
      // Their package.json `exports` field lacks a "browser" condition,
      // so webpack 5 resolves to the Node entry point (which imports
      // stream, zlib, fs — all unavailable in the browser).
      // These aliases bypass the exports resolution entirely.
      const nmDir = path.resolve(__dirname, "node_modules");
      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-pdf/renderer": path.join(
          nmDir,
          "@react-pdf/renderer/lib/react-pdf.browser.js",
        ),
        "@react-pdf/pdfkit": path.join(
          nmDir,
          "@react-pdf/pdfkit/lib/pdfkit.browser.js",
        ),
        "@react-pdf/font": path.join(
          nmDir,
          "@react-pdf/font/lib/index.browser.js",
        ),
        canvas: false,
      };

      // The browser builds use pako (pure JS zlib) and inline stream
      // polyfills, so Node built-ins aren't needed. Keep false as safety net.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        stream: false,
        zlib: false,
        util: false,
      };

      // Provide Buffer and process globals for @react-pdf/renderer
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        }),
      );
    }
    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Wider source map upload is memory-intensive and pushes the 8 GB Vercel
  // build container over the OOM threshold. Default upload (false) still
  // captures stack traces for all routes — just with shorter module paths.
  widenClientFileUpload: false,

  // React component annotation adds a Babel transform pass over every
  // component file which spikes peak memory by ~300–500 MB on large apps.
  // Disabled to keep the build within the 8 GB container limit.
  reactComponentAnnotation: {
    enabled: false,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

// Export with Sentry wrapping (only in production or if SENTRY_DSN is set)
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
