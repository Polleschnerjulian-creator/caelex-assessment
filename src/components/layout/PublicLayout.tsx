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
      <Navigation />
      {children}
      <Footer />
    </>
  );
}
