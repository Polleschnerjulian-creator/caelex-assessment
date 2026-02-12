import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import PublicLayout from "@/components/layout/PublicLayout";
import CookieConsent from "@/components/CookieConsent";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Caelex | EU Space Act Compliance Assessment",
  description:
    "Find out if and how the EU Space Act affects your space operations. Free compliance assessment in 3 minutes.",
  keywords: [
    "EU Space Act",
    "space compliance",
    "satellite regulation",
    "space law",
    "EUSPA",
  ],
  authors: [{ name: "Caelex" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Caelex | EU Space Act Compliance Assessment",
    description:
      "Find out if and how the EU Space Act affects your space operations. Free compliance assessment in 3 minutes.",
    type: "website",
  },
};

// Script to prevent flash of wrong theme on initial load
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('caelex-theme') || 'system';
      const isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    } catch (e) {
      // Default to dark mode on error
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} font-sans antialiased bg-white dark:bg-[#0A0A0B] text-slate-900 dark:text-white transition-colors`}
      >
        <Providers>
          <PublicLayout>{children}</PublicLayout>
        </Providers>
        <ConditionalAnalytics />
        <CookieConsent />
      </body>
    </html>
  );
}
