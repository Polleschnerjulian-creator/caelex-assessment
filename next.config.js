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
  // HTTP Strict Transport Security (1 year + preload)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
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
];

const nextConfig = {
  // Apply security headers to all routes
  // NOTE: CSP is handled dynamically in middleware.ts with nonces
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Disable x-powered-by header (information disclosure)
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

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
    ],
  },

  // Prevent Next.js from bundling @react-pdf packages server-side.
  // v3.4.5 embeds react-reconciler v0.23.0 which breaks when Next.js
  // resolves React via the "react-server" condition (missing __SECRET_INTERNALS).
  // Using native Node.js require() resolves React via the "default" condition.
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/layout",
    "@react-pdf/pdfkit",
    "@react-pdf/font",
    "@react-pdf/render",
    "@react-pdf/stylesheet",
    "@react-pdf/textkit",
    "@react-pdf/primitives",
  ],

  // Experimental features
  experimental: {
    // Type-safe server actions
    typedRoutes: false, // Enable when ready
    // Limit server action body size to 10MB (prevents abuse)
    serverActions: {
      bodySizeLimit: "10mb",
    },
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

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
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
