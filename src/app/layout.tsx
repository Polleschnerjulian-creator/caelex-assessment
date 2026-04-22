import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import PublicLayout from "@/components/layout/PublicLayout";
import CookieConsent from "@/components/CookieConsent";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name} — ${siteConfig.tagline}`,
  },
  description: siteConfig.description,
  keywords: [
    "EU Space Act",
    "space compliance",
    "satellite regulation",
    "space law",
    "NIS2 space",
    "space licensing",
    "EUSPA",
    "space debris mitigation",
    "satellite cybersecurity",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": `${siteConfig.url}/rss.xml`,
    },
  },
  verification: {
    // Site-ownership verification meta tags. Values come from env vars
    // so rotating or updating a code never requires a code change.
    //
    // To activate:
    //   1. Google Search Console → Add Property → URL-prefix (https://caelex.eu)
    //      → HTML tag method → copy the content="..." value
    //      → set SEARCH_CONSOLE_GOOGLE=<that value> in Vercel env
    //   2. Bing Webmaster Tools → Add Site → HTML Meta Tag
    //      → set SEARCH_CONSOLE_BING=<content value>
    //   3. Yandex Webmaster → Add Site → Meta Tag
    //      → set SEARCH_CONSOLE_YANDEX=<content value>
    //
    // Unset env vars resolve to `undefined`, which Next.js omits from
    // the rendered <meta> tags — so the absence of a key is safe.
    google: process.env.SEARCH_CONSOLE_GOOGLE,
    yandex: process.env.SEARCH_CONSOLE_YANDEX,
    other: {
      // Bing uses `msvalidate.01` as the verification meta name —
      // Next.js only knows "google" + "yandex" natively, so Bing
      // rides in via `other`.
      ...(process.env.SEARCH_CONSOLE_BING
        ? { "msvalidate.01": process.env.SEARCH_CONSOLE_BING }
        : {}),
      // IndexNow endpoint — tells Bing + Yandex where our key file
      // lives so they can verify ownership of pushed URL changes.
      // See /public/indexnow-<KEY>.txt which is served alongside.
      ...(process.env.INDEXNOW_KEY
        ? { "indexnow-key": process.env.INDEXNOW_KEY }
        : {}),
    },
  },
};

// Light mode — clean Palantir × Apple aesthetic

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </head>
      <body
        className={`${inter.className} font-sans antialiased bg-light-bg text-slate-900`}
      >
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <Providers>
          <PublicLayout>{children}</PublicLayout>
        </Providers>
        <ConditionalAnalytics />
        <CookieConsent />
      </body>
    </html>
  );
}
