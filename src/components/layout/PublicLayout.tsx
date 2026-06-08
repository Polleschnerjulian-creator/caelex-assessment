"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// Routes that should NOT show navigation + footer (prefix match).
// IMPORTANT: keep marketing pages OUT of this list. The `/trade` app
// shell vs `/trade-access` marketing page distinction is handled by
// the exact-/prefix-match split below.
const EXCLUDED_ROUTES = [
  "/dashboard",
  "/assure",
  "/atlas",
  "/pharos",
  // Admin/Analytics Center: the (admin) AdminShell renders its own full-screen
  // chrome, so suppress the public Navigation/Footer (which otherwise collide
  // with the admin sidebar + topbar).
  "/admin",
  "/login",
  "/signup",
  "/assessment",
  "/supplier",
  "/academy",
  "/verity",
  "/testdemo1",
  "/onboarding",
  "/linkedin-banner",
  // Trade auth + access surfaces — their own TradeAuthShell renders
  // the chrome, so we suppress the public Navigation/Footer here too.
  "/trade-login",
  "/trade-forgot-password",
  "/trade-reset-password",
  "/trade-no-access",
  // Scholar auth + access surfaces — Scholar has its own light shell.
  "/scholar-login",
  "/scholar-forgot-password",
  "/scholar-reset-password",
  "/scholar-no-access",
];

// Routes excluded by an EXACT or `/route/`-prefix match. Used for
// segments where a sibling marketing page shares the prefix and must
// NOT be excluded (e.g. `/trade` is the app, `/trade-access` is the
// marketing page — naïve `.startsWith("/trade")` would catch both).
// `/scholar` is the app shell; `/scholar-access` (if it exists) is
// the marketing page — same pattern as `/trade` vs `/trade-access`.
const EXACT_OR_SUBPATH_EXCLUDED = ["/trade", "/scholar"];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isExcluded =
    EXCLUDED_ROUTES.some((route) => pathname.startsWith(route)) ||
    EXACT_OR_SUBPATH_EXCLUDED.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
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
      <Navigation theme="light" />
      <main id="main-content">{children}</main>
      <Footer theme="light" />
    </>
  );
}
