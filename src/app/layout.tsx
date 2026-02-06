import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Providers from "@/components/Providers";
import PublicLayout from "@/components/layout/PublicLayout";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} font-sans antialiased bg-white dark:bg-[#0A0A0B] text-slate-900 dark:text-white transition-colors`}
      >
        <Providers>
          <PublicLayout>{children}</PublicLayout>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
