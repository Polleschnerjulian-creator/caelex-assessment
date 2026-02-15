"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// Routes that should NOT show navigation + footer
const EXCLUDED_ROUTES = [
  "/dashboard",
  "/login",
  "/signup",
  "/assessment",
  "/supplier",
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isExcluded = EXCLUDED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <Navigation />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
