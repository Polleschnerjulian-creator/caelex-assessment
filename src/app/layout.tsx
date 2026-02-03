import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

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
  openGraph: {
    title: "Caelex | EU Space Act Compliance Assessment",
    description:
      "Find out if and how the EU Space Act affects your space operations. Free compliance assessment in 3 minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
