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
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      // Default: only allow same origin
      "default-src 'self'",
      // Scripts: self, inline (for Next.js), eval (for dev), Google OAuth, Sentry, Vercel, blob: for @react-pdf/renderer workers
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://accounts.google.com https://apis.google.com https://*.sentry.io https://va.vercel-scripts.com",
      // Styles: self, inline (for CSS-in-JS), Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self, Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: self, data URIs, HTTPS, blob (for file previews)
      "img-src 'self' data: https: blob:",
      // Connections: self, auth providers, database, analytics, Sentry, Stripe, blob: for @react-pdf/renderer
      "connect-src 'self' blob: https://accounts.google.com https://*.neon.tech wss://*.neon.tech https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io https://api.stripe.com https://vitals.vercel-insights.com",
      // Frames: Google OAuth popup, Stripe
      "frame-src 'self' https://accounts.google.com https://js.stripe.com https://hooks.stripe.com",
      // Form submissions: only to self
      "form-action 'self'",
      // Base URI: only self
      "base-uri 'self'",
      // Prevent embedding in frames
      "frame-ancestors 'none'",
      // Upgrade HTTP to HTTPS
      "upgrade-insecure-requests",
      // Block all object/embed
      "object-src 'none'",
      // Worker scripts
      "worker-src 'self' blob:",
      // Manifest
      "manifest-src 'self'",
    ].join("; "),
  },
];

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  // Apply security headers to all routes (production only for CSP)
  async headers() {
    // In development, skip CSP to allow hot reload and inline styles
    if (isDev) {
      return [
        {
          source: "/:path*",
          headers: securityHeaders.filter(
            (h) => h.key !== "Content-Security-Policy",
          ),
        },
      ];
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Additional CSP for API routes (more restrictive)
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'none'",
          },
        ],
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
