/** @type {import('next').NextConfig} */

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
      // Scripts: self, inline (for Next.js), eval (for dev), Google OAuth
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
      // Styles: self, inline (for CSS-in-JS), Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self, Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: self, data URIs, HTTPS, blob (for file previews)
      "img-src 'self' data: https: blob:",
      // Connections: self, auth providers, database, analytics
      "connect-src 'self' https://accounts.google.com https://*.neon.tech wss://*.neon.tech https://*.upstash.io https://*.sentry.io",
      // Frames: Google OAuth popup
      "frame-src 'self' https://accounts.google.com",
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
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Ignore node-specific modules on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
