"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AssureSidebar from "@/components/assure/AssureSidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

// ─── Route Title Map ───

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/assure/dashboard": "Dashboard",
  "/assure/profile": "Company Profile",
  "/assure/score": "Investment Readiness",
  "/assure/risks": "Risk Intelligence",
  "/assure/materials": "Investor Materials",
  "/assure/dataroom": "Data Room",
  "/assure/benchmarks": "Benchmarks",
  "/assure/investors": "Investor Relations",
  "/assure/settings": "Settings",
};

// ─── Layout Content ───

function AssureLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Derive page title from route
  let pageTitle: string | undefined;

  // Check exact match first
  if (ROUTE_TITLE_MAP[pathname]) {
    pageTitle = ROUTE_TITLE_MAP[pathname];
  } else {
    // Find the closest parent route
    const matchedKey = Object.keys(ROUTE_TITLE_MAP)
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];
    if (matchedKey) {
      pageTitle = ROUTE_TITLE_MAP[matchedKey];
    }
  }

  // Skip layout for landing, onboarding, and public view pages
  const isUnlayouted =
    pathname === "/assure" ||
    pathname === "/assure/onboarding" ||
    pathname === "/assure/demo" ||
    pathname === "/assure/book" ||
    pathname === "/assure/request-access" ||
    pathname.startsWith("/assure/view/") ||
    pathname.startsWith("/assure/dataroom/view/");

  if (isUnlayouted) {
    return <div className="dark">{children}</div>;
  }

  return (
    <div className="dark min-h-screen bg-navy-950">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <AssureSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className="flex flex-col min-h-screen">
          <TopBar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
          <main id="main-content" className="flex-1 p-6 lg:p-10">
            <div className="max-w-[1400px] mx-auto">
              <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Layout Export ───

export default function AssureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <OrganizationProvider>
        <ToastProvider>
          <AssureLayoutContent>{children}</AssureLayoutContent>
        </ToastProvider>
      </OrganizationProvider>
    </LanguageProvider>
  );
}
